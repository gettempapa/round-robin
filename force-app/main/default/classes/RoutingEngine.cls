public with sharing class RoutingEngine {
    public class RoutingRequest {
        @InvocableVariable(required=true)
        public Id recordId;
    }

    public class RoutingResult {
        @InvocableVariable
        public Id recordId;
        @InvocableVariable
        public Id recommendedGroupId;
        @InvocableVariable
        public Id recommendedOwnerId;
        @InvocableVariable
        public Id matchedAccountId;
        @InvocableVariable
        public Id matchedRuleId;
        @InvocableVariable
        public String matchedRuleName;
        @InvocableVariable
        public String notes;
    }

    private class RuleBundle {
        public Routing_Rule__c rule;
        public List<Routing_Rule_Condition__c> conditions = new List<Routing_Rule_Condition__c>();
    }

    @InvocableMethod(label='Recommend Routing Group' description='Evaluates routing rules and returns a recommended routing group and optional owner.')
    public static List<RoutingResult> recommend(List<RoutingRequest> requests) {
        List<RoutingResult> results = new List<RoutingResult>();
        if (requests == null || requests.isEmpty()) {
            return results;
        }

        Set<Id> leadIds = new Set<Id>();
        Set<Id> contactIds = new Set<Id>();
        Set<Id> accountIds = new Set<Id>();
        for (RoutingRequest request : requests) {
            if (request == null || request.recordId == null) {
                continue;
            }
            Schema.SObjectType sobjectType = request.recordId.getSObjectType();
            if (sobjectType == Lead.SObjectType) {
                leadIds.add(request.recordId);
            } else if (sobjectType == Contact.SObjectType) {
                contactIds.add(request.recordId);
            } else if (sobjectType == Account.SObjectType) {
                accountIds.add(request.recordId);
            }
        }

        Map<Id, Lead> leads = queryLeads(leadIds);
        Map<Id, Contact> contacts = queryContacts(contactIds);
        Map<Id, Account> accounts = queryAccounts(accountIds);

        List<RuleBundle> ruleBundles = loadActiveRules();
        if (ruleBundles.isEmpty()) {
            for (RoutingRequest request : requests) {
                RoutingResult emptyResult = new RoutingResult();
                emptyResult.recordId = request.recordId;
                emptyResult.notes = 'No active routing rules found.';
                results.add(emptyResult);
            }
            return results;
        }

        Map<Id, Id> matchedAccountByRecord = new Map<Id, Id>();
        Set<Id> matchedAccountIds = new Set<Id>();
        for (Id leadId : leadIds) {
            Lead leadRecord = leads.get(leadId);
            Id matchedAccountId = matchAccountForLead(leadRecord);
            matchedAccountByRecord.put(leadId, matchedAccountId);
            if (matchedAccountId != null) {
                matchedAccountIds.add(matchedAccountId);
            }
        }
        for (Id contactId : contactIds) {
            Contact contactRecord = contacts.get(contactId);
            Id matchedAccountId = contactRecord != null ? contactRecord.AccountId : null;
            matchedAccountByRecord.put(contactId, matchedAccountId);
            if (matchedAccountId != null) {
                matchedAccountIds.add(matchedAccountId);
            }
        }
        for (Id accountId : accountIds) {
            matchedAccountByRecord.put(accountId, accountId);
            matchedAccountIds.add(accountId);
        }

        Map<Id, Account> matchedAccounts = queryAccounts(matchedAccountIds);

        Map<Id, List<Routing_Group_Member__c>> membersByGroup = new Map<Id, List<Routing_Group_Member__c>>();
        Set<Id> groupIds = new Set<Id>();
        for (RuleBundle bundle : ruleBundles) {
            if (bundle.rule.Group__c != null) {
                groupIds.add(bundle.rule.Group__c);
            }
        }
        if (!groupIds.isEmpty()) {
            for (Routing_Group_Member__c member : [
                SELECT Id, Group__c, User__c, Active__c, Weight__c, Assigned_Count__c, Last_Assigned_At__c
                FROM Routing_Group_Member__c
                WHERE Group__c IN :groupIds AND Active__c = true
            ]) {
                if (!membersByGroup.containsKey(member.Group__c)) {
                    membersByGroup.put(member.Group__c, new List<Routing_Group_Member__c>());
                }
                membersByGroup.get(member.Group__c).add(member);
            }
        }

        List<Routing_Group_Member__c> membersToUpdate = new List<Routing_Group_Member__c>();

        for (RoutingRequest request : requests) {
            if (request == null || request.recordId == null) {
                continue;
            }

            SObject record = resolveRecord(request.recordId, leads, contacts, accounts);
            RoutingResult result = new RoutingResult();
            result.recordId = request.recordId;

            if (record == null) {
                result.notes = 'Record not found.';
                results.add(result);
                continue;
            }

            Id matchedAccountId = matchedAccountByRecord.get(request.recordId);
            Account matchedAccount = matchedAccountId != null ? matchedAccounts.get(matchedAccountId) : null;
            Map<String, String> context = buildRoutingContext(record, matchedAccount);

            Boolean matched = false;
            for (RuleBundle bundle : ruleBundles) {
                if (bundle.rule == null || bundle.rule.Is_Active__c != true) {
                    continue;
                }
                if (evaluateRule(bundle, context)) {
                    matched = true;
                    result.recommendedGroupId = bundle.rule.Group__c;
                    result.matchedRuleId = bundle.rule.Id;
                    result.matchedRuleName = bundle.rule.Name;
                    result.matchedAccountId = matchedAccountId;

                    Routing_Group_Member__c chosenMember = selectMember(bundle.rule.Group__c, membersByGroup);
                    if (chosenMember != null) {
                        result.recommendedOwnerId = chosenMember.User__c;
                        chosenMember.Assigned_Count__c = (chosenMember.Assigned_Count__c == null ? 0 : chosenMember.Assigned_Count__c) + 1;
                        chosenMember.Last_Assigned_At__c = System.now();
                        membersToUpdate.add(chosenMember);
                    }
                    break;
                }
            }

            if (!matched) {
                result.notes = 'No matching rule found.';
                result.matchedAccountId = matchedAccountId;
            }

            results.add(result);
        }

        if (!membersToUpdate.isEmpty()) {
            update membersToUpdate;
        }

        return results;
    }

    private static Routing_Group_Member__c selectMember(Id groupId, Map<Id, List<Routing_Group_Member__c>> membersByGroup) {
        if (groupId == null || !membersByGroup.containsKey(groupId)) {
            return null;
        }

        Routing_Group_Member__c bestMember;
        Decimal bestScore;

        for (Routing_Group_Member__c member : membersByGroup.get(groupId)) {
            Decimal weight = member.Weight__c == null || member.Weight__c <= 0 ? 1 : member.Weight__c;
            Decimal assigned = member.Assigned_Count__c == null ? 0 : member.Assigned_Count__c;
            Decimal score = assigned / weight;

            if (bestMember == null || score < bestScore) {
                bestMember = member;
                bestScore = score;
            } else if (score == bestScore) {
                if (member.Last_Assigned_At__c == null && bestMember.Last_Assigned_At__c != null) {
                    bestMember = member;
                } else if (member.Last_Assigned_At__c != null && bestMember.Last_Assigned_At__c != null) {
                    if (member.Last_Assigned_At__c < bestMember.Last_Assigned_At__c) {
                        bestMember = member;
                    }
                }
            }
        }

        return bestMember;
    }

    private static Boolean evaluateRule(RuleBundle bundle, Map<String, String> context) {
        if (bundle == null || bundle.rule == null) {
            return false;
        }

        String logic = bundle.rule.Match_Logic__c == null ? 'AND' : bundle.rule.Match_Logic__c;
        if (bundle.conditions.isEmpty()) {
            return false;
        }

        if (logic == 'OR') {
            for (Routing_Rule_Condition__c condition : bundle.conditions) {
                if (evaluateCondition(condition, context)) {
                    return true;
                }
            }
            return false;
        }

        for (Routing_Rule_Condition__c condition : bundle.conditions) {
            if (!evaluateCondition(condition, context)) {
                return false;
            }
        }
        return true;
    }

    private static Boolean evaluateCondition(Routing_Rule_Condition__c condition, Map<String, String> context) {
        if (condition == null) {
            return false;
        }
        String fieldName = condition.Field__c;
        String operatorName = condition.Operator__c;
        String conditionValue = condition.Value__c;
        String rawValue = context.containsKey(fieldName) ? context.get(fieldName) : null;
        String fieldValue = rawValue == null ? '' : rawValue.trim().toLowerCase();
        String compareValue = conditionValue == null ? '' : conditionValue.trim().toLowerCase();

        if (operatorName == 'isBlank') {
            return String.isBlank(rawValue);
        }
        if (operatorName == 'isPresent') {
            return !String.isBlank(rawValue);
        }

        if (operatorName == 'equals') {
            return fieldValue == compareValue;
        }
        if (operatorName == 'notEquals') {
            return fieldValue != compareValue;
        }
        if (operatorName == 'contains') {
            return fieldValue.contains(compareValue);
        }
        if (operatorName == 'notContains') {
            return !fieldValue.contains(compareValue);
        }
        if (operatorName == 'startsWith') {
            return fieldValue.startsWith(compareValue);
        }
        if (operatorName == 'greaterThan') {
            return parseDecimal(fieldValue) > parseDecimal(compareValue);
        }
        if (operatorName == 'lessThan') {
            return parseDecimal(fieldValue) < parseDecimal(compareValue);
        }

        return false;
    }

    private static Decimal parseDecimal(String value) {
        if (String.isBlank(value)) {
            return 0;
        }
        try {
            return Decimal.valueOf(value);
        } catch (Exception e) {
            return 0;
        }
    }

    private static List<RuleBundle> loadActiveRules() {
        List<Routing_Rule__c> rules = [
            SELECT Id, Name, Group__c, Priority__c, Is_Active__c, Match_Logic__c
            FROM Routing_Rule__c
            WHERE Is_Active__c = true
            ORDER BY Priority__c ASC, CreatedDate ASC
        ];

        Map<Id, RuleBundle> bundlesById = new Map<Id, RuleBundle>();
        for (Routing_Rule__c ruleRecord : rules) {
            RuleBundle bundle = new RuleBundle();
            bundle.rule = ruleRecord;
            bundlesById.put(ruleRecord.Id, bundle);
        }

        if (!bundlesById.isEmpty()) {
            for (Routing_Rule_Condition__c condition : [
                SELECT Id, Rule__c, Field__c, Operator__c, Value__c, Sort_Order__c
                FROM Routing_Rule_Condition__c
                WHERE Rule__c IN :bundlesById.keySet()
                ORDER BY Sort_Order__c ASC, CreatedDate ASC
            ]) {
                RuleBundle bundle = bundlesById.get(condition.Rule__c);
                if (bundle != null) {
                    bundle.conditions.add(condition);
                }
            }
        }

        List<RuleBundle> bundles = new List<RuleBundle>();
        for (Routing_Rule__c ruleRecord : rules) {
            if (bundlesById.containsKey(ruleRecord.Id)) {
                bundles.add(bundlesById.get(ruleRecord.Id));
            }
        }
        return bundles;
    }

    private static Map<Id, Lead> queryLeads(Set<Id> leadIds) {
        if (leadIds.isEmpty()) {
            return new Map<Id, Lead>();
        }
        List<String> fieldNames = new List<String>{
            'Id', 'Email', 'Company', 'LeadSource', 'Status', 'Industry', 'Country', 'State', 'City',
            'Title', 'Department', 'NumberOfEmployees', 'AnnualRevenue', 'Website', 'ConvertedAccountId'
        };
        addIfFieldExists(Lead.SObjectType, fieldNames, new List<String>{
            'Lifecycle_Stage__c', 'Inbound_Channel__c', 'Product_Interest__c', 'Region__c',
            'Company_Size__c', 'Account_Tier__c', 'Campaign__c', 'Primary_Campaign__c'
        });

        String soql = 'SELECT ' + String.join(fieldNames, ',') + ' FROM Lead WHERE Id IN :leadIds';
        return new Map<Id, Lead>((List<Lead>)Database.query(soql));
    }

    private static Map<Id, Contact> queryContacts(Set<Id> contactIds) {
        if (contactIds.isEmpty()) {
            return new Map<Id, Contact>();
        }
        List<String> fieldNames = new List<String>{
            'Id', 'Email', 'AccountId', 'LeadSource', 'Title', 'Department', 'MailingCountry',
            'MailingState', 'MailingCity'
        };
        addIfFieldExists(Contact.SObjectType, fieldNames, new List<String>{
            'Lifecycle_Stage__c', 'Inbound_Channel__c', 'Product_Interest__c', 'Region__c',
            'Company_Size__c', 'Account_Tier__c', 'Campaign__c', 'Primary_Campaign__c'
        });

        String soql = 'SELECT ' + String.join(fieldNames, ',') + ' FROM Contact WHERE Id IN :contactIds';
        return new Map<Id, Contact>((List<Contact>)Database.query(soql));
    }

    private static Map<Id, Account> queryAccounts(Set<Id> accountIds) {
        if (accountIds.isEmpty()) {
            return new Map<Id, Account>();
        }
        List<String> fieldNames = new List<String>{
            'Id', 'Name', 'Industry', 'Website', 'NumberOfEmployees', 'AnnualRevenue',
            'BillingCountry', 'BillingState', 'BillingCity'
        };
        addIfFieldExists(Account.SObjectType, fieldNames, new List<String>{
            'Lifecycle_Stage__c', 'Inbound_Channel__c', 'Product_Interest__c', 'Region__c',
            'Company_Size__c', 'Account_Tier__c', 'Domain__c'
        });

        String soql = 'SELECT ' + String.join(fieldNames, ',') + ' FROM Account WHERE Id IN :accountIds';
        return new Map<Id, Account>((List<Account>)Database.query(soql));
    }

    private static void addIfFieldExists(Schema.SObjectType sobjectType, List<String> fields, List<String> optionalFields) {
        Map<String, Schema.SObjectField> fieldMap = sobjectType.getDescribe().fields.getMap();
        for (String fieldName : optionalFields) {
            if (fieldMap.containsKey(fieldName)) {
                fields.add(fieldName);
            }
        }
    }

    private static SObject resolveRecord(Id recordId, Map<Id, Lead> leads, Map<Id, Contact> contacts, Map<Id, Account> accounts) {
        if (leads.containsKey(recordId)) {
            return leads.get(recordId);
        }
        if (contacts.containsKey(recordId)) {
            return contacts.get(recordId);
        }
        if (accounts.containsKey(recordId)) {
            return accounts.get(recordId);
        }
        return null;
    }

    private static Id matchAccountForLead(Lead leadRecord) {
        if (leadRecord == null) {
            return null;
        }
        if (leadRecord.ConvertedAccountId != null) {
            return leadRecord.ConvertedAccountId;
        }

        String emailDomain = extractDomain(leadRecord.Email);
        if (String.isBlank(emailDomain)) {
            return null;
        }

        List<String> conditions = new List<String>();
        conditions.add('Website LIKE :domainLike');

        Boolean hasDomainField = Account.SObjectType.getDescribe().fields.getMap().containsKey('Domain__c');
        if (hasDomainField) {
            conditions.add('Domain__c = :emailDomain');
        }

        String domainLike = '%' + emailDomain + '%';
        String soql = 'SELECT Id FROM Account WHERE (' + String.join(conditions, ' OR ') + ') ORDER BY LastModifiedDate DESC LIMIT 1';
        List<Account> matches = Database.query(soql);
        if (!matches.isEmpty()) {
            return matches[0].Id;
        }
        return null;
    }

    private static String extractDomain(String email) {
        if (String.isBlank(email) || !email.contains('@')) {
            return null;
        }
        String domain = email.substringAfter('@');
        if (String.isBlank(domain)) {
            return null;
        }
        return domain.trim().toLowerCase();
    }

    private static Map<String, String> buildRoutingContext(SObject record, Account matchedAccount) {
        Map<String, String> context = new Map<String, String>();

        if (record == null) {
            return context;
        }

        context.put('leadSource', getFieldValue(record, new List<String>{'LeadSource'}));
        context.put('leadStatus', getFieldValue(record, new List<String>{'Status', 'Lead_Status__c'}));
        context.put('lifecycleStage', getFieldValue(record, new List<String>{'Lifecycle_Stage__c'}));
        context.put('campaign', getFieldValue(record, new List<String>{'Campaign__c', 'Primary_Campaign__c'}));
        context.put('inboundChannel', getFieldValue(record, new List<String>{'Inbound_Channel__c', 'Acquisition_Channel__c'}));
        context.put('productInterest', getFieldValue(record, new List<String>{'Product_Interest__c'}));
        context.put('region', getFieldValue(record, new List<String>{'Region__c'}));
        context.put('department', getFieldValue(record, new List<String>{'Department'}));
        context.put('jobTitle', getFieldValue(record, new List<String>{'Title'}));
        context.put('email', getFieldValue(record, new List<String>{'Email'}));

        if (record.getSObjectType() == Lead.SObjectType) {
            Lead leadRecord = (Lead)record;
            context.put('company', leadRecord.Company);
            context.put('industry', leadRecord.Industry);
            context.put('country', leadRecord.Country);
            context.put('state', leadRecord.State);
            context.put('city', leadRecord.City);
            context.put('employeeCount', leadRecord.NumberOfEmployees == null ? null : String.valueOf(leadRecord.NumberOfEmployees));
            context.put('annualRevenue', leadRecord.AnnualRevenue == null ? null : String.valueOf(leadRecord.AnnualRevenue));
            context.put('companyDomain', deriveDomain(leadRecord.Email, leadRecord.Website));
            context.put('companySize', getFieldValue(leadRecord, new List<String>{'Company_Size__c'}));
            context.put('accountTier', getFieldValue(leadRecord, new List<String>{'Account_Tier__c'}));
        } else if (record.getSObjectType() == Contact.SObjectType) {
            Contact contactRecord = (Contact)record;
            context.put('country', contactRecord.MailingCountry);
            context.put('state', contactRecord.MailingState);
            context.put('city', contactRecord.MailingCity);
            context.put('companyDomain', deriveDomain(contactRecord.Email, matchedAccount != null ? matchedAccount.Website : null));
        } else if (record.getSObjectType() == Account.SObjectType) {
            Account accountRecord = (Account)record;
            context.put('company', accountRecord.Name);
            context.put('industry', accountRecord.Industry);
            context.put('country', accountRecord.BillingCountry);
            context.put('state', accountRecord.BillingState);
            context.put('city', accountRecord.BillingCity);
            context.put('employeeCount', accountRecord.NumberOfEmployees == null ? null : String.valueOf(accountRecord.NumberOfEmployees));
            context.put('annualRevenue', accountRecord.AnnualRevenue == null ? null : String.valueOf(accountRecord.AnnualRevenue));
            context.put('companyDomain', deriveDomain(null, accountRecord.Website));
            context.put('companySize', getFieldValue(accountRecord, new List<String>{'Company_Size__c'}));
            context.put('accountTier', getFieldValue(accountRecord, new List<String>{'Account_Tier__c'}));
        }

        if (matchedAccount != null) {
            context.put('company', defaultIfBlank(context.get('company'), matchedAccount.Name));
            context.put('industry', defaultIfBlank(context.get('industry'), matchedAccount.Industry));
            context.put('companyDomain', defaultIfBlank(context.get('companyDomain'), deriveDomain(null, matchedAccount.Website)));
            context.put('employeeCount', defaultIfBlank(context.get('employeeCount'), matchedAccount.NumberOfEmployees == null ? null : String.valueOf(matchedAccount.NumberOfEmployees)));
            context.put('annualRevenue', defaultIfBlank(context.get('annualRevenue'), matchedAccount.AnnualRevenue == null ? null : String.valueOf(matchedAccount.AnnualRevenue)));
            context.put('companySize', defaultIfBlank(context.get('companySize'), getFieldValue(matchedAccount, new List<String>{'Company_Size__c'})));
            context.put('accountTier', defaultIfBlank(context.get('accountTier'), getFieldValue(matchedAccount, new List<String>{'Account_Tier__c'})));
            context.put('region', defaultIfBlank(context.get('region'), getFieldValue(matchedAccount, new List<String>{'Region__c'})));
        }

        return context;
    }

    private static String deriveDomain(String email, String website) {
        String domainFromEmail = extractDomain(email);
        if (!String.isBlank(domainFromEmail)) {
            return domainFromEmail;
        }
        if (String.isBlank(website)) {
            return null;
        }
        String cleaned = website.toLowerCase();
        cleaned = cleaned.replace('http://', '').replace('https://', '');
        Integer slashIndex = cleaned.indexOf('/');
        if (slashIndex > 0) {
            cleaned = cleaned.substring(0, slashIndex);
        }
        return cleaned.trim();
    }

    private static String getFieldValue(SObject record, List<String> fieldCandidates) {
        if (record == null) {
            return null;
        }
        Map<String, Schema.SObjectField> fieldMap = record.getSObjectType().getDescribe().fields.getMap();
        for (String fieldName : fieldCandidates) {
            if (fieldMap.containsKey(fieldName)) {
                Object rawValue = record.get(fieldName);
                if (rawValue != null) {
                    return String.valueOf(rawValue);
                }
            }
        }
        return null;
    }

    private static String defaultIfBlank(String currentValue, String fallbackValue) {
        if (String.isBlank(currentValue)) {
            return fallbackValue;
        }
        return currentValue;
    }
}
