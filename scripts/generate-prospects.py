#!/usr/bin/env python3
"""
Generates random prospects and adds them to RoundRobin every 2 minutes.
Usage: python scripts/generate-prospects.py
"""

import random
import time
import requests
import json
from datetime import datetime

API_URL = "https://roundrobin-gamma.vercel.app/api/contacts"

FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kevin", "Dorothy", "Brian", "Carol", "George", "Amanda", "Edward", "Melissa",
    "Wei", "Priya", "Hiroshi", "Fatima", "Carlos", "Olga", "Ahmed", "Yuki"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Chen", "Patel", "Kim", "Singh", "Yamamoto", "Muller", "Ivanov", "Santos"
]

COMPANIES = [
    "Acme Corp", "TechFlow Inc", "DataDrive Solutions", "CloudNine Systems",
    "Velocity Partners", "Apex Industries", "Summit Technologies", "Nova Digital",
    "Pinnacle Software", "Fusion Analytics", "Quantum Labs", "Nexus Consulting",
    "Horizon Media", "Catalyst Group", "Synergy Solutions", "Prime Ventures",
    "Atlas Global", "Vertex Solutions", "Meridian Tech", "Pulse Digital",
    "Elevate Inc", "Spark Innovation", "Core Systems", "Bridge Partners",
    "Titan Industries", "Phoenix Group", "Sterling Co", "Vanguard Tech",
    "Insight Analytics", "Momentum Labs", "Stratos Cloud", "Zenith Corp"
]

JOB_TITLES = [
    "CEO", "CTO", "CFO", "VP of Sales", "VP of Marketing", "VP of Engineering",
    "Director of Operations", "Director of Sales", "Director of Marketing",
    "Sales Manager", "Marketing Manager", "Product Manager", "Engineering Manager",
    "Account Executive", "Business Development Rep", "Sales Representative",
    "Marketing Specialist", "Software Engineer", "Data Analyst", "Project Manager",
    "Operations Manager", "HR Manager", "Finance Manager", "IT Director",
    "Founder", "Co-Founder", "Partner", "Principal", "Head of Growth"
]

LEAD_SOURCES = [
    "Website", "LinkedIn", "Referral", "Trade Show", "Webinar", "Cold Outreach",
    "Google Ads", "Content Marketing", "Partner", "Social Media", "Email Campaign",
    "Organic Search", "Direct", "Event", "Demo Request"
]

INDUSTRIES = [
    "Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education",
    "Real Estate", "Consulting", "Media", "Transportation", "Energy", "Hospitality",
    "Construction", "Legal", "Insurance", "Telecommunications", "Automotive",
    "Aerospace", "Pharmaceuticals", "Agriculture", "Entertainment", "Non-Profit"
]

COUNTRIES = [
    "United States", "Canada", "United Kingdom", "Germany", "France", "Australia",
    "Japan", "Singapore", "Netherlands", "Sweden", "Switzerland", "Ireland",
    "Brazil", "Mexico", "India", "South Korea", "Spain", "Italy", "Belgium"
]

COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+", "SMB", "Enterprise"]


def generate_email(first_name: str, last_name: str, company: str) -> str:
    """Generate a realistic email address."""
    domain = company.lower().replace(" ", "").replace(".", "")[:12]
    formats = [
        f"{first_name.lower()}.{last_name.lower()}@{domain}.com",
        f"{first_name[0].lower()}{last_name.lower()}@{domain}.com",
        f"{first_name.lower()}@{domain}.com",
        f"{first_name.lower()}{last_name[0].lower()}@{domain}.io",
    ]
    return random.choice(formats)


def generate_phone() -> str:
    """Generate a random US phone number."""
    area_codes = ["415", "650", "408", "510", "925", "628", "669", "341", "820", "737"]
    return f"+1 ({random.choice(area_codes)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}"


def generate_prospect() -> dict:
    """Generate a random prospect with realistic data."""
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    company = random.choice(COMPANIES)

    return {
        "name": f"{first_name} {last_name}",
        "email": generate_email(first_name, last_name, company),
        "phone": generate_phone(),
        "company": company,
        "jobTitle": random.choice(JOB_TITLES),
        "leadSource": random.choice(LEAD_SOURCES),
        "industry": random.choice(INDUSTRIES),
        "country": random.choice(COUNTRIES),
        "companySize": random.choice(COMPANY_SIZES),
    }


def create_prospect(prospect: dict) -> bool:
    """Send prospect to the API."""
    try:
        response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json=prospect,
            timeout=30
        )

        if response.status_code in [200, 201]:
            data = response.json()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Created: {prospect['name']} ({prospect['email']}) - {prospect['company']}")
            if data.get('assignment'):
                print(f"    → Routed to: {data['assignment'].get('user', {}).get('name', 'Unknown')}")
            return True
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Failed ({response.status_code}): {response.text[:100]}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Error: {e}")
        return False


def main():
    print("=" * 60)
    print("RoundRobin Prospect Generator")
    print(f"API: {API_URL}")
    print("Generating a new prospect every 2 minutes...")
    print("Press Ctrl+C to stop")
    print("=" * 60)
    print()

    count = 0

    try:
        while True:
            prospect = generate_prospect()
            if create_prospect(prospect):
                count += 1

            print(f"    Total created: {count} | Next prospect in 2 minutes...")
            print()
            time.sleep(120)  # 2 minutes

    except KeyboardInterrupt:
        print()
        print("=" * 60)
        print(f"Stopped. Total prospects created: {count}")
        print("=" * 60)


if __name__ == "__main__":
    main()
