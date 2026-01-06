import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getObjectInfo, getPicklistValues, getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import { createRecord, getRecord } from 'lightning/uiRecordApi';

import ROUTING_RULE_OBJECT from '@salesforce/schema/Routing_Rule__c';
import ROUTING_RULE_NAME_FIELD from '@salesforce/schema/Routing_Rule__c.Name';
import ROUTING_RULE_DESCRIPTION_FIELD from '@salesforce/schema/Routing_Rule__c.Description__c';
import ROUTING_RULE_GROUP_FIELD from '@salesforce/schema/Routing_Rule__c.Group__c';
import ROUTING_RULE_MATCH_LOGIC_FIELD from '@salesforce/schema/Routing_Rule__c.Match_Logic__c';
import ROUTING_RULE_PRIORITY_FIELD from '@salesforce/schema/Routing_Rule__c.Priority__c';

import ROUTING_RULE_CONDITION_OBJECT from '@salesforce/schema/Routing_Rule_Condition__c';
import CONDITION_FIELD_FIELD from '@salesforce/schema/Routing_Rule_Condition__c.Field__c';
import CONDITION_OPERATOR_FIELD from '@salesforce/schema/Routing_Rule_Condition__c.Operator__c';
import CONDITION_VALUE_FIELD from '@salesforce/schema/Routing_Rule_Condition__c.Value__c';
import CONDITION_RULE_FIELD from '@salesforce/schema/Routing_Rule_Condition__c.Rule__c';
import CONDITION_SORT_FIELD from '@salesforce/schema/Routing_Rule_Condition__c.Sort_Order__c';

import ROUTING_GROUP_NAME_FIELD from '@salesforce/schema/Routing_Group__c.Name';

let rowSeed = 0;
const DEFAULT_ROW = () => ({
  id: `row-${rowSeed++}`,
  field: '',
  operator: '',
  value: ''
});

export default class RoutingRuleBuilder extends LightningElement {
  sampleRules = [
    {
      id: 'inbound-enterprise',
      label: 'Inbound Enterprise',
      description: 'Route high-intent inbound leads with 500+ employees.',
      matchLogic: 'AND',
      priority: '10',
      conditions: [
        { field: 'inboundChannel', operator: 'equals', value: 'Web' },
        { field: 'companySize', operator: 'greaterThan', value: '500' }
      ]
    },
    {
      id: 'midmarket-emea',
      label: 'Mid-Market EMEA',
      description: 'Send EMEA mid-market to the regional pod.',
      matchLogic: 'AND',
      priority: '20',
      conditions: [
        { field: 'region', operator: 'equals', value: 'EMEA' },
        { field: 'accountTier', operator: 'equals', value: 'Mid-Market' }
      ]
    },
    {
      id: 'partner-contacts',
      label: 'Partner/Alliances',
      description: 'Keep partner-sourced contacts together.',
      matchLogic: 'OR',
      priority: '30',
      conditions: [
        { field: 'leadSource', operator: 'contains', value: 'Partner' },
        { field: 'department', operator: 'equals', value: 'Alliances' }
      ]
    }
  ];
  ruleObjectApiName = ROUTING_RULE_OBJECT;
  ruleNameField = ROUTING_RULE_NAME_FIELD;
  ruleDescriptionField = ROUTING_RULE_DESCRIPTION_FIELD;
  ruleGroupField = ROUTING_RULE_GROUP_FIELD;
  ruleMatchLogicField = ROUTING_RULE_MATCH_LOGIC_FIELD;
  rulePriorityField = ROUTING_RULE_PRIORITY_FIELD;

  conditionRows = [DEFAULT_ROW()];
  fieldOptions = [];
  operatorOptions = [];
  matchLogicOptions = [];
  isSaving = false;
  recordTypeId;
  ruleRecordTypeId;
  ruleDraft = {
    name: '',
    description: '',
    groupId: '',
    matchLogic: '',
    priority: ''
  };
  groupName = '';

  @wire(getObjectInfo, { objectApiName: ROUTING_RULE_CONDITION_OBJECT })
  handleObjectInfo({ data }) {
    if (data) {
      this.recordTypeId = data.defaultRecordTypeId;
    }
  }

  @wire(getObjectInfo, { objectApiName: ROUTING_RULE_OBJECT })
  handleRuleObjectInfo({ data }) {
    if (data) {
      this.ruleRecordTypeId = data.defaultRecordTypeId;
    }
  }

  @wire(getPicklistValuesByRecordType, {
    objectApiName: ROUTING_RULE_OBJECT,
    recordTypeId: '$ruleRecordTypeId'
  })
  handlePicklists({ data }) {
    if (data?.picklistFieldValues) {
      this.matchLogicOptions = data.picklistFieldValues.Match_Logic__c?.values || [];
    }
  }

  @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: CONDITION_FIELD_FIELD })
  handleFieldPicklists({ data }) {
    if (data?.values) {
      this.fieldOptions = data.values;
    }
  }

  @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: CONDITION_OPERATOR_FIELD })
  handleOperatorPicklists({ data }) {
    if (data?.values) {
      this.operatorOptions = data.values;
    }
  }

  @wire(getRecord, { recordId: '$ruleDraft.groupId', fields: [ROUTING_GROUP_NAME_FIELD] })
  handleGroupRecord({ data }) {
    if (data?.fields?.Name?.value) {
      this.groupName = data.fields.Name.value;
    } else {
      this.groupName = '';
    }
  }

  handleRuleFieldChange(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    this.ruleDraft = { ...this.ruleDraft, [field]: value };
  }

  addCondition() {
    this.conditionRows = [...this.conditionRows, DEFAULT_ROW()];
  }

  removeCondition(event) {
    const index = parseInt(event.currentTarget.dataset.index, 10);
    if (this.conditionRows.length === 1) {
      this.conditionRows = [DEFAULT_ROW()];
      return;
    }
    this.conditionRows = this.conditionRows.filter((_, idx) => idx !== index);
  }

  handleConditionChange(event) {
    const index = parseInt(event.currentTarget.dataset.index, 10);
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;

    this.conditionRows = this.conditionRows.map((row, idx) => {
      if (idx !== index) return row;
      return { ...row, [field]: value };
    });
  }

  handleRuleSubmit(event) {
    event.preventDefault();
    this.isSaving = true;
    const fields = event.detail.fields;
    event.target.submit(fields);
  }

  applySample(event) {
    const sampleId = event.currentTarget.dataset.sampleId;
    const sample = this.sampleRules.find((rule) => rule.id === sampleId);
    if (!sample) return;

    this.ruleDraft = {
      ...this.ruleDraft,
      name: sample.label,
      description: sample.description,
      matchLogic: sample.matchLogic,
      priority: sample.priority
    };

    this.conditionRows = sample.conditions.map((condition) => ({
      id: `row-${rowSeed++}`,
      field: condition.field,
      operator: condition.operator,
      value: condition.value
    }));
  }

  async handleRuleSuccess(event) {
    const ruleId = event.detail.id;
    const conditionPayloads = this.conditionRows
      .filter((row) => row.field && row.operator)
      .map((row, index) => ({
        apiName: ROUTING_RULE_CONDITION_OBJECT.objectApiName,
        fields: {
          [CONDITION_RULE_FIELD.fieldApiName]: ruleId,
          [CONDITION_FIELD_FIELD.fieldApiName]: row.field,
          [CONDITION_OPERATOR_FIELD.fieldApiName]: row.operator,
          [CONDITION_VALUE_FIELD.fieldApiName]: row.value,
          [CONDITION_SORT_FIELD.fieldApiName]: index + 1
        }
      }));

    try {
      if (conditionPayloads.length > 0) {
        await Promise.all(conditionPayloads.map((record) => createRecord(record)));
      }

      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Routing rule created',
          message: conditionPayloads.length
            ? 'Your rule and conditions are ready.'
            : 'Your rule is ready. Add conditions any time.',
          variant: 'success'
        })
      );

      this.resetForm();
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Failed to create conditions',
          message: error.body?.message || 'Please review the condition values and try again.',
          variant: 'error'
        })
      );
    } finally {
      this.isSaving = false;
    }
  }

  handleRuleError(event) {
    this.isSaving = false;
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Failed to create rule',
        message: event.detail?.message || 'Please check required fields and try again.',
        variant: 'error'
      })
    );
  }

  resetForm() {
    const inputs = this.template.querySelectorAll('lightning-input-field');
    inputs.forEach((input) => input.reset());
    this.conditionRows = [DEFAULT_ROW()];
    this.ruleDraft = {
      name: '',
      description: '',
      groupId: '',
      matchLogic: '',
      priority: ''
    };
    this.groupName = '';
  }

  get guidanceTips() {
    const tips = [];
    if (!this.ruleDraft.groupId) {
      tips.push('Pick a routing group so the rule has a destination.');
    }
    if (!this.ruleDraft.matchLogic) {
      tips.push('Set match logic to AND or OR to control how conditions combine.');
    }
    const hasConditions = this.conditionRows.some((row) => row.field && row.operator);
    if (!hasConditions) {
      tips.push('Add at least one condition to describe who qualifies.');
    }
    if (tips.length === 0) {
      tips.push('Looks good. Create the rule when you are ready.');
    }
    return tips;
  }

  get previewLines() {
    const lines = [];
    const ruleName = this.ruleDraft.name || 'Untitled rule';
    const matchLogicLabel = this.getPicklistLabel(this.matchLogicOptions, this.ruleDraft.matchLogic);
    const groupLabel = this.groupName || 'Unselected routing group';

    lines.push(`Rule: ${ruleName}`);
    lines.push(`Route to: ${groupLabel}`);
    if (this.ruleDraft.matchLogic) {
      lines.push(`Match logic: ${matchLogicLabel || this.ruleDraft.matchLogic}`);
    }
    if (this.ruleDraft.priority) {
      lines.push(`Priority: ${this.ruleDraft.priority}`);
    }

    const conditionLines = this.conditionRows
      .filter((row) => row.field && row.operator)
      .map((row, index) => {
        const fieldLabel = this.getPicklistLabel(this.fieldOptions, row.field);
        const operatorLabel = this.getPicklistLabel(this.operatorOptions, row.operator);
        const value = row.value ? `\"${row.value}\"` : 'any value';
        return `${index + 1}. If ${fieldLabel || row.field} ${operatorLabel || row.operator} ${value}`;
      });

    return lines.concat(conditionLines);
  }

  getPicklistLabel(options, value) {
    const match = options.find((option) => option.value === value);
    return match ? match.label : '';
  }
}
