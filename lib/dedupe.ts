import { db } from "./db";
import { v4 as uuidv4 } from "uuid";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  leadSource: string | null;
  industry: string | null;
  country: string | null;
  companySize: string | null;
  createdAt: Date;
  isDuplicate: boolean;
  duplicateGroupId: string | null;
  mergedIntoId: string | null;
};

/**
 * Calculate similarity between two strings (0-1 scale)
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Simple character overlap similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 0;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  return matches / longer.length;
}

/**
 * Check if two contacts are likely duplicates
 */
function areDuplicates(contact1: Contact, contact2: Contact): boolean {
  // Exact email match (strongest signal)
  if (contact1.email && contact2.email && contact1.email === contact2.email) {
    return true;
  }

  // Same name + same company
  if (
    contact1.name &&
    contact2.name &&
    contact1.company &&
    contact2.company
  ) {
    const nameSim = stringSimilarity(contact1.name, contact2.name);
    const companySim = stringSimilarity(contact1.company, contact2.company);

    if (nameSim > 0.85 && companySim > 0.85) {
      return true;
    }
  }

  // Same phone number (if exists)
  if (
    contact1.phone &&
    contact2.phone &&
    contact1.phone.replace(/\D/g, "") === contact2.phone.replace(/\D/g, "")
  ) {
    return true;
  }

  return false;
}

/**
 * Detect all duplicate contacts and group them
 */
export async function detectDuplicates(): Promise<{
  duplicateGroups: Contact[][];
  totalDuplicates: number;
}> {
  // Get all contacts that aren't already merged
  const contacts = await db.contact.findMany({
    where: {
      mergedIntoId: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const duplicateGroups: Contact[][] = [];
  const processed = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    if (processed.has(contacts[i].id)) continue;

    const group: Contact[] = [contacts[i]];
    processed.add(contacts[i].id);

    for (let j = i + 1; j < contacts.length; j++) {
      if (processed.has(contacts[j].id)) continue;

      if (areDuplicates(contacts[i], contacts[j])) {
        group.push(contacts[j]);
        processed.add(contacts[j].id);
      }
    }

    // Only include groups with 2+ contacts
    if (group.length > 1) {
      duplicateGroups.push(group);
    }
  }

  // Update database to mark duplicates
  for (const group of duplicateGroups) {
    const groupId = uuidv4();

    for (const contact of group) {
      await db.contact.update({
        where: { id: contact.id },
        data: {
          isDuplicate: true,
          duplicateGroupId: groupId,
        },
      });
    }
  }

  return {
    duplicateGroups,
    totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.length, 0),
  };
}

/**
 * Intelligently suggest which contact to keep as master
 */
export function suggestMasterContact(contacts: Contact[]): Contact {
  // Prefer the one with:
  // 1. Most complete data
  // 2. Oldest creation date (first in system)

  let bestContact = contacts[0];
  let bestScore = 0;

  for (const contact of contacts) {
    let score = 0;

    // Add points for each filled field
    if (contact.email) score += 10;
    if (contact.phone) score += 5;
    if (contact.company) score += 5;
    if (contact.jobTitle) score += 3;
    if (contact.industry) score += 2;
    if (contact.country) score += 2;
    if (contact.companySize) score += 2;
    if (contact.leadSource) score += 1;

    // Bonus for being older (first in system)
    const daysSinceCreated =
      (Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    score += daysSinceCreated * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestContact = contact;
    }
  }

  return bestContact;
}

/**
 * Merge multiple contacts into a master contact
 */
export async function mergeContacts(
  masterContactId: string,
  duplicateContactIds: string[],
  fieldPreferences?: Record<string, string> // field -> contactId to take value from
): Promise<Contact> {
  // Get all contacts
  const allContacts = await db.contact.findMany({
    where: {
      id: { in: [masterContactId, ...duplicateContactIds] },
    },
    include: {
      assignments: true,
      bookings: true,
    },
  });

  const masterContact = allContacts.find((c) => c.id === masterContactId);
  if (!masterContact) {
    throw new Error("Master contact not found");
  }

  const duplicates = allContacts.filter((c) => c.id !== masterContactId);

  // Build merged data - prefer master, but use duplicates to fill gaps
  const mergedData: any = {
    name: masterContact.name,
    email: masterContact.email,
    phone: masterContact.phone,
    company: masterContact.company,
    jobTitle: masterContact.jobTitle,
    leadSource: masterContact.leadSource,
    industry: masterContact.industry,
    country: masterContact.country,
    companySize: masterContact.companySize,
  };

  // Apply field preferences if provided
  if (fieldPreferences) {
    for (const [field, sourceContactId] of Object.entries(fieldPreferences)) {
      const sourceContact = allContacts.find((c) => c.id === sourceContactId);
      if (sourceContact && sourceContact[field as keyof typeof sourceContact]) {
        mergedData[field] = sourceContact[field as keyof typeof sourceContact];
      }
    }
  } else {
    // Auto-fill missing fields from duplicates (use most complete data)
    for (const dup of duplicates) {
      for (const field of Object.keys(mergedData)) {
        if (
          !mergedData[field] &&
          dup[field as keyof typeof dup] &&
          field !== "id"
        ) {
          mergedData[field] = dup[field as keyof typeof dup];
        }
      }
    }
  }

  // Update master contact with merged data
  await db.contact.update({
    where: { id: masterContactId },
    data: {
      ...mergedData,
      isDuplicate: false,
      duplicateGroupId: null,
    },
  });

  // Re-assign all assignments and bookings to master contact
  for (const dup of duplicates) {
    // Move assignments
    await db.assignment.updateMany({
      where: { contactId: dup.id },
      data: { contactId: masterContactId },
    });

    // Move bookings
    await db.booking.updateMany({
      where: { contactId: dup.id },
      data: { contactId: masterContactId },
    });

    // Mark duplicate as merged
    await db.contact.update({
      where: { id: dup.id },
      data: {
        mergedIntoId: masterContactId,
        isDuplicate: false,
        duplicateGroupId: null,
      },
    });
  }

  // Return updated master contact
  const updatedMaster = await db.contact.findUnique({
    where: { id: masterContactId },
  });

  return updatedMaster as Contact;
}

/**
 * Get all duplicate groups
 */
export async function getDuplicateGroups(): Promise<Contact[][]> {
  const duplicateContacts = await db.contact.findMany({
    where: {
      isDuplicate: true,
      mergedIntoId: null,
    },
    orderBy: { duplicateGroupId: "asc" },
  });

  // Group by duplicateGroupId
  const groupMap = new Map<string, Contact[]>();

  for (const contact of duplicateContacts) {
    if (!contact.duplicateGroupId) continue;

    if (!groupMap.has(contact.duplicateGroupId)) {
      groupMap.set(contact.duplicateGroupId, []);
    }

    groupMap.get(contact.duplicateGroupId)!.push(contact as Contact);
  }

  return Array.from(groupMap.values());
}
