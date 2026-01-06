@IsTest
public class RoutingEngineTest {
    @IsTest
    static void recommend_returns_group_and_owner() {
        Routing_Group__c groupRecord = new Routing_Group__c(
            Name = 'Enterprise North America',
            Is_Active__c = true
        );
        insert groupRecord;

        User testUser = createUser('rr_user_1');
        Routing_Group_Member__c member = new Routing_Group_Member__c(
            Group__c = groupRecord.Id,
            User__c = testUser.Id,
            Weight__c = 1,
            Active__c = true
        );
        insert member;

        Routing_Rule__c rule = new Routing_Rule__c(
            Name = 'US Routing',
            Is_Active__c = true,
            Priority__c = 1,
            Group__c = groupRecord.Id,
            Match_Logic__c = 'AND'
        );
        insert rule;

        Routing_Rule_Condition__c condition = new Routing_Rule_Condition__c(
            Rule__c = rule.Id,
            Field__c = 'country',
            Operator__c = 'equals',
            Value__c = 'United States',
            Sort_Order__c = 1
        );
        insert condition;

        Account accountRecord = new Account(Name = 'Acme', Website = 'acme.com');
        insert accountRecord;

        Lead leadRecord = new Lead(
            FirstName = 'Ada',
            LastName = 'Lovelace',
            Company = 'Acme',
            Email = 'ada@acme.com',
            Country = 'United States'
        );
        insert leadRecord;

        RoutingEngine.RoutingRequest request = new RoutingEngine.RoutingRequest();
        request.recordId = leadRecord.Id;

        Test.startTest();
        List<RoutingEngine.RoutingResult> results = RoutingEngine.recommend(new List<RoutingEngine.RoutingRequest>{ request });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return one result');
        RoutingEngine.RoutingResult result = results[0];
        System.assertEquals(groupRecord.Id, result.recommendedGroupId, 'Expected group recommendation');
        System.assertEquals(testUser.Id, result.recommendedOwnerId, 'Expected owner recommendation');
        System.assertEquals(rule.Id, result.matchedRuleId, 'Expected matched rule');
        System.assertEquals(accountRecord.Id, result.matchedAccountId, 'Expected matched account');
    }

    private static User createUser(String aliasSeed) {
        Profile profile = [SELECT Id FROM Profile WHERE Id = :UserInfo.getProfileId() LIMIT 1];
        String uniqueSuffix = String.valueOf(System.now().getTime());
        User userRecord = new User(
            Alias = aliasSeed.left(8),
            Email = aliasSeed + '@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Routing',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = profile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            Username = aliasSeed + '+' + uniqueSuffix + '@example.com'
        );
        insert userRecord;
        return userRecord;
    }
}
