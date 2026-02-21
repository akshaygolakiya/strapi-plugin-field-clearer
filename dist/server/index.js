"use strict";
const bootstrap = ({ strapi }) => {
};
const destroy = ({ strapi }) => {
};
const register = ({ strapi }) => {
};
const config = {
  default: {
    // Default allowed content types - users can override in their config/plugins.js
    allowedContentTypes: []
  },
  validator(config2) {
    if (config2.allowedContentTypes !== void 0) {
      if (!Array.isArray(config2.allowedContentTypes)) {
        throw new Error("field-clearer: allowedContentTypes must be an array");
      }
      for (const contentType of config2.allowedContentTypes) {
        if (typeof contentType !== "string") {
          throw new Error("field-clearer: each allowedContentTypes entry must be a string");
        }
        if (!/^(api|plugin)::[a-z0-9-]+\.[a-z0-9-]+$/.test(contentType)) {
          throw new Error(
            `field-clearer: invalid content type format "${contentType}". Expected format: "api::collection-name.collection-name" or "plugin::plugin-name.content-type"`
          );
        }
      }
    }
  }
};
const contentTypes = {};
const PLUGIN_ID = "field-clearer";
const VALID_FIELD_PATH_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(\[\d+(,\d+)*\])?(\.[a-zA-Z_][a-zA-Z0-9_]*){0,2}$/;
const MAX_FIELD_PATH_LENGTH = 100;
const MAX_DOCUMENT_ID_LENGTH = 50;
const getAllowedContentTypes = (strapi) => {
  const config2 = strapi.config.get(`plugin::${PLUGIN_ID}`);
  return config2?.allowedContentTypes || [];
};
const validateFieldPath = (fieldPath) => {
  if (typeof fieldPath !== "string") {
    return { valid: false, error: "fieldPath must be a string" };
  }
  const trimmed = fieldPath.trim();
  if (!trimmed) {
    return { valid: false, error: "fieldPath cannot be empty" };
  }
  if (trimmed.length > MAX_FIELD_PATH_LENGTH) {
    return { valid: false, error: `fieldPath exceeds maximum length of ${MAX_FIELD_PATH_LENGTH}` };
  }
  if (!VALID_FIELD_PATH_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid fieldPath format. Examples: "coupons", "coupons.freebies", "coupons[1].freebies", "coupons[0,2].freebies"' };
  }
  return { valid: true };
};
const validateDocumentId = (documentId) => {
  if (!documentId) {
    return { valid: true };
  }
  if (typeof documentId !== "string") {
    return { valid: false, error: "documentId must be a string" };
  }
  const trimmed = documentId.trim();
  if (trimmed.length > MAX_DOCUMENT_ID_LENGTH) {
    return { valid: false, error: `documentId exceeds maximum length of ${MAX_DOCUMENT_ID_LENGTH}` };
  }
  if (trimmed && !/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { valid: false, error: "documentId contains invalid characters" };
  }
  return { valid: true };
};
const controller = ({ strapi }) => ({
  /**
   * Get plugin configuration for admin UI
   * GET /field-clearer/config
   */
  async getConfig(ctx) {
    const allowedContentTypes = getAllowedContentTypes(strapi);
    return ctx.send({ allowedContentTypes });
  },
  /**
   * Preview what will be deleted (dry run)
   * POST /field-clearer/preview-field
   * Body: { contentType, documentId, fieldPath }
   */
  async previewField(ctx) {
    try {
      const { contentType, documentId, fieldPath } = ctx.request.body;
      if (!contentType || typeof contentType !== "string") {
        return ctx.badRequest("contentType is required and must be a string");
      }
      const allowedContentTypes = getAllowedContentTypes(strapi);
      if (allowedContentTypes.length === 0) {
        return ctx.forbidden("No content types are configured. Please configure allowedContentTypes in config/plugins.js");
      }
      if (!allowedContentTypes.includes(contentType)) {
        return ctx.forbidden(`Content type "${contentType}" is not allowed for this operation`);
      }
      const docIdValidation = validateDocumentId(documentId);
      if (!docIdValidation.valid) {
        return ctx.badRequest(docIdValidation.error);
      }
      const fieldPathValidation = validateFieldPath(fieldPath);
      if (!fieldPathValidation.valid) {
        return ctx.badRequest(fieldPathValidation.error);
      }
      const result = await strapi.plugin(PLUGIN_ID).service("service").previewField(contentType, documentId ? documentId.trim() : "", fieldPath.trim());
      return ctx.send(result);
    } catch (error) {
      strapi.log.error("[field-clearer] Preview field error:", error);
      return ctx.badRequest(error instanceof Error ? error.message : "An error occurred");
    }
  },
  /**
   * Clear a field from a document
   * POST /field-clearer/clear-field
   * Body: { contentType, documentId, fieldPath }
   *
   * Examples:
   * - fieldPath: "coupons" → clears all coupons
   * - fieldPath: "coupons.freebies" → clears freebies inside each coupon
   * - fieldPath: "coupons[1].freebies" → clears freebies from 2nd coupon only
   */
  async clearField(ctx) {
    try {
      const { contentType, documentId, fieldPath } = ctx.request.body;
      if (!contentType || typeof contentType !== "string") {
        return ctx.badRequest("contentType is required and must be a string");
      }
      const allowedContentTypes = getAllowedContentTypes(strapi);
      if (allowedContentTypes.length === 0) {
        return ctx.forbidden("No content types are configured. Please configure allowedContentTypes in config/plugins.js");
      }
      if (!allowedContentTypes.includes(contentType)) {
        return ctx.forbidden(`Content type "${contentType}" is not allowed for this operation`);
      }
      const docIdValidation = validateDocumentId(documentId);
      if (!docIdValidation.valid) {
        return ctx.badRequest(docIdValidation.error);
      }
      const fieldPathValidation = validateFieldPath(fieldPath);
      if (!fieldPathValidation.valid) {
        return ctx.badRequest(fieldPathValidation.error);
      }
      strapi.log.info(`[field-clearer] Clearing field "${fieldPath}" on ${contentType} (documentId: ${documentId || "single-type"})`);
      const result = await strapi.plugin(PLUGIN_ID).service("service").clearField(contentType, documentId ? documentId.trim() : "", fieldPath.trim());
      strapi.log.info(`[field-clearer] Successfully cleared "${fieldPath}" - ${result.clearedCount} items`);
      return ctx.send(result);
    } catch (error) {
      strapi.log.error("[field-clearer] Clear field error:", error);
      return ctx.badRequest(error instanceof Error ? error.message : "An error occurred");
    }
  }
});
const controllers = {
  controller
};
const middlewares = {};
const policies = {};
const routes = [
  {
    method: "GET",
    path: "/config",
    handler: "controller.getConfig",
    config: {
      policies: ["admin::isAuthenticatedAdmin"]
    }
  },
  {
    method: "POST",
    path: "/preview-field",
    handler: "controller.previewField",
    config: {
      policies: ["admin::isAuthenticatedAdmin"]
    }
  },
  {
    method: "POST",
    path: "/clear-field",
    handler: "controller.clearField",
    config: {
      policies: ["admin::isAuthenticatedAdmin"]
    }
  }
];
const parseFieldPath = (path) => {
  const bracketMatch = path.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+(?:,\d+)*)\](?:\.([a-zA-Z_][a-zA-Z0-9_]*))?(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?$/);
  if (bracketMatch) {
    const [, fieldName, indicesStr, nestedField, deepNestedField] = bracketMatch;
    const indices = indicesStr.split(",").map(Number);
    return { fieldName, nestedField, deepNestedField, indices };
  }
  const parts = path.split(".");
  if (parts.length === 1) {
    return { fieldName: parts[0], indices: null };
  }
  if (parts.length === 2) {
    return { fieldName: parts[0], nestedField: parts[1], indices: null };
  }
  if (parts.length === 3) {
    return { fieldName: parts[0], nestedField: parts[1], deepNestedField: parts[2], indices: null };
  }
  throw new Error(`Invalid path format: "${path}"`);
};
const service = ({ strapi }) => ({
  /**
   * Fetch a document by documentId, or use findFirst() for single types when documentId is empty.
   * Optionally specify status ('published' or 'draft') - defaults to Strapi's default (draft in admin context).
   */
  async fetchDocument(contentType, documentId, populate, status) {
    const params = { populate };
    if (status) {
      params.status = status;
    }
    if (documentId) {
      params.documentId = documentId;
      return strapi.documents(contentType).findOne(params);
    }
    return strapi.documents(contentType).findFirst(params);
  },
  /**
   * Smart fetch for reading relation data: tries published version first (which has complete
   * relation data), then falls back to draft. This works around the Strapi v5 draft/publish
   * issue where relation join tables can have mixed draft/published product IDs, causing the
   * draft version to return incomplete relations.
   */
  async fetchDocumentWithPublishedFallback(contentType, documentId, populate) {
    try {
      const publishedDoc = await this.fetchDocument(contentType, documentId, populate, "published");
      if (publishedDoc) {
        return publishedDoc;
      }
    } catch (e) {
    }
    return this.fetchDocument(contentType, documentId, populate);
  },
  /**
   * Preview what will be deleted (dry run - no actual deletion)
   * Returns field info and items that would be deleted
   */
  async previewField(contentType, documentId, fieldPath) {
    if (!contentType || typeof contentType !== "string") {
      throw new Error("Invalid contentType provided");
    }
    if (documentId && typeof documentId !== "string") {
      throw new Error("Invalid documentId provided");
    }
    if (!fieldPath || typeof fieldPath !== "string") {
      throw new Error("Invalid fieldPath provided");
    }
    const trimmedPath = fieldPath.trim();
    if (!trimmedPath) {
      throw new Error("Field path cannot be empty");
    }
    const { fieldName, nestedField, deepNestedField, indices } = parseFieldPath(trimmedPath);
    if (!fieldName) {
      throw new Error("Field path cannot be empty");
    }
    if (!nestedField) {
      return this.previewTopLevelField(contentType, documentId, fieldName);
    }
    if (deepNestedField) {
      return this.previewDeepNestedField(contentType, documentId, fieldName, nestedField, deepNestedField, indices);
    }
    return this.previewNestedField(contentType, documentId, fieldName, nestedField, indices);
  },
  /**
   * Preview a top-level field deletion
   */
  async previewTopLevelField(contentType, documentId, fieldName) {
    let document;
    try {
      document = await this.fetchDocument(contentType, documentId, "*");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch document: ${message}`);
    }
    if (!document) {
      throw new Error("Document not found");
    }
    const fieldValue = document[fieldName];
    if (fieldValue === void 0) {
      throw new Error(`Field "${fieldName}" does not exist on this content type`);
    }
    const isEmpty = this.isFieldEmpty(fieldValue);
    const itemCount = this.countFieldItems(fieldValue);
    const items = this.extractPreviewItems(fieldValue, fieldName);
    return {
      fieldPath: fieldName,
      fieldType: this.getFieldType(fieldValue),
      isEmpty,
      itemCount,
      items,
      message: isEmpty ? `Field "${fieldName}" is already empty` : `Will delete ${itemCount} item${itemCount !== 1 ? "s" : ""} from "${fieldName}"`
    };
  },
  /**
   * Preview a nested field deletion
   * @param indices - Optional array of component indices to target (0-based). If null, targets all components.
   */
  async previewNestedField(contentType, documentId, componentField, nestedField, indices = null) {
    const populate = {
      [componentField]: {
        populate: {
          [nestedField]: true
        }
      }
    };
    let document;
    try {
      document = await this.fetchDocumentWithPublishedFallback(contentType, documentId, populate);
    } catch (error) {
      try {
        document = await this.fetchDocument(contentType, documentId, {
          [componentField]: {
            populate: "*"
          }
        });
      } catch (finalError) {
        const message = finalError instanceof Error ? finalError.message : "Unknown error";
        throw new Error(`Failed to fetch document: ${message}`);
      }
    }
    if (!document) {
      throw new Error("Document not found");
    }
    const components = document[componentField];
    const displayPath = indices ? `${componentField}[${indices.join(",")}].${nestedField}` : `${componentField}.${nestedField}`;
    if (components === void 0) {
      throw new Error(`Field "${componentField}" does not exist on this content type`);
    }
    if (components === null) {
      return {
        fieldPath: displayPath,
        fieldType: "unknown",
        isEmpty: true,
        itemCount: 0,
        items: [],
        message: `"${componentField}" is null on this document`
      };
    }
    if (Array.isArray(components) && components.length === 0) {
      return {
        fieldPath: displayPath,
        fieldType: "unknown",
        isEmpty: true,
        itemCount: 0,
        items: [],
        message: `No "${componentField}" found on this document`
      };
    }
    const componentArray = Array.isArray(components) ? components : [components];
    if (indices) {
      for (const idx of indices) {
        if (idx < 0 || idx >= componentArray.length) {
          throw new Error(`Index ${idx} is out of range. "${componentField}" has ${componentArray.length} item${componentArray.length !== 1 ? "s" : ""} (indices 0-${componentArray.length - 1})`);
        }
      }
    }
    const targetIndices = indices || componentArray.map((_, i) => i);
    let totalCount = 0;
    let nestedFieldExists = false;
    const allItems = [];
    let fieldType = "unknown";
    for (const i of targetIndices) {
      const comp = componentArray[i];
      if (comp && comp[nestedField] !== void 0) {
        nestedFieldExists = true;
        const value = comp[nestedField];
        const count = this.countFieldItems(value);
        totalCount += count;
        fieldType = this.getFieldType(value);
        const items = this.extractPreviewItems(value, nestedField);
        items.forEach((item) => {
          allItems.push({
            ...item,
            componentIndex: i,
            componentHandle: comp.__component || comp.handle || comp.title || comp.name || `#${i + 1}`
          });
        });
      }
    }
    if (!nestedFieldExists) {
      throw new Error(`Field "${nestedField}" does not exist inside "${componentField}"`);
    }
    const isEmpty = totalCount === 0;
    const targetDescription = indices ? `${targetIndices.length} selected "${componentField}"` : `${componentArray.length} "${componentField}"`;
    return {
      fieldPath: displayPath,
      fieldType,
      isEmpty,
      itemCount: totalCount,
      componentCount: targetIndices.length,
      totalComponentCount: componentArray.length,
      targetIndices,
      items: allItems,
      message: isEmpty ? `"${nestedField}" is already empty in ${targetDescription}` : `Will delete ${totalCount} item${totalCount !== 1 ? "s" : ""} from "${nestedField}" across ${targetDescription}`
    };
  },
  /**
   * Preview a deep nested field deletion (3 levels: e.g., "blocks[0].items.subfield")
   * Used for fields inside components within dynamic zones or repeatable components
   */
  async previewDeepNestedField(contentType, documentId, parentField, componentField, nestedField, indices = null) {
    const populate = {
      [parentField]: {
        populate: {
          [componentField]: {
            populate: {
              [nestedField]: true
            }
          }
        }
      }
    };
    let document;
    try {
      document = await this.fetchDocumentWithPublishedFallback(contentType, documentId, populate);
    } catch (error) {
      try {
        document = await this.fetchDocument(contentType, documentId, {
          [parentField]: {
            populate: {
              [componentField]: {
                populate: "*"
              }
            }
          }
        });
      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : "Unknown error";
        throw new Error(`Failed to fetch document: ${message}`);
      }
    }
    if (!document) {
      throw new Error("Document not found");
    }
    const parentComponents = document[parentField];
    const displayPath = indices ? `${parentField}[${indices.join(",")}].${componentField}.${nestedField}` : `${parentField}.${componentField}.${nestedField}`;
    if (parentComponents === void 0) {
      throw new Error(`Field "${parentField}" does not exist on this content type`);
    }
    if (parentComponents === null || Array.isArray(parentComponents) && parentComponents.length === 0) {
      return {
        fieldPath: displayPath,
        fieldType: "unknown",
        isEmpty: true,
        itemCount: 0,
        items: [],
        message: `"${parentField}" is empty on this document`
      };
    }
    const parentArray = Array.isArray(parentComponents) ? parentComponents : [parentComponents];
    if (indices) {
      for (const idx of indices) {
        if (idx < 0 || idx >= parentArray.length) {
          throw new Error(`Index ${idx} is out of range. "${parentField}" has ${parentArray.length} item${parentArray.length !== 1 ? "s" : ""} (indices 0-${parentArray.length - 1})`);
        }
      }
    }
    const targetIndices = indices || parentArray.map((_, i) => i);
    let totalCount = 0;
    let fieldExists = false;
    const allItems = [];
    let fieldType = "unknown";
    for (const i of targetIndices) {
      const parentComp = parentArray[i];
      if (!parentComp) continue;
      const subComponent = parentComp[componentField];
      if (subComponent === void 0) continue;
      const subArray = Array.isArray(subComponent) ? subComponent : subComponent ? [subComponent] : [];
      for (let j = 0; j < subArray.length; j++) {
        const sub = subArray[j];
        if (sub && sub[nestedField] !== void 0) {
          fieldExists = true;
          const value = sub[nestedField];
          const count = this.countFieldItems(value);
          totalCount += count;
          fieldType = this.getFieldType(value);
          const items = this.extractPreviewItems(value, nestedField);
          items.forEach((item) => {
            allItems.push({
              ...item,
              componentIndex: i,
              componentHandle: parentComp.__component || parentComp.handle || parentComp.title || parentComp.name || `#${i + 1}`
            });
          });
        }
      }
    }
    if (!fieldExists) {
      throw new Error(`Field "${nestedField}" does not exist inside "${parentField}.${componentField}"`);
    }
    const isEmpty = totalCount === 0;
    const targetDescription = indices ? `${targetIndices.length} selected "${parentField}"` : `${parentArray.length} "${parentField}"`;
    return {
      fieldPath: displayPath,
      fieldType,
      isEmpty,
      itemCount: totalCount,
      componentCount: targetIndices.length,
      totalComponentCount: parentArray.length,
      targetIndices,
      items: allItems,
      message: isEmpty ? `"${nestedField}" is already empty in ${targetDescription}` : `Will delete ${totalCount} item${totalCount !== 1 ? "s" : ""} from "${nestedField}" across ${targetDescription}`
    };
  },
  /**
   * Get a human-readable field type
   */
  getFieldType(value) {
    if (value === null || value === void 0) {
      return "empty";
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return "array (empty)";
      const first = value[0];
      if (first && typeof first === "object") {
        if (first.__component) return "dynamic zone";
        if (first.documentId) return "relation (array)";
        if (first.id) return "component (repeatable)";
      }
      return "array";
    }
    if (typeof value === "object") {
      if (value.documentId) return "relation (single)";
      if (value.url) return "media";
      if (value.id) return "component (single)";
      return "object";
    }
    return typeof value;
  },
  /**
   * Extract preview items from a field value
   */
  extractPreviewItems(value, fieldName) {
    if (value === null || value === void 0) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((item, index2) => {
        if (typeof item === "object" && item !== null) {
          const label = item.__component ? `[${item.__component}] ${item.title || item.name || item.handle || item.code || `#${index2 + 1}`}` : item.title || item.name || item.handle || item.code || item.documentId || `Item ${index2 + 1}`;
          return {
            index: index2,
            id: item.id || item.documentId,
            label,
            type: item.__component ? "dynamic zone component" : item.documentId ? "relation" : "component"
          };
        }
        return {
          index: index2,
          label: String(item).substring(0, 50),
          type: typeof item
        };
      });
    }
    if (typeof value === "object") {
      return [{
        id: value.id || value.documentId,
        label: value.title || value.name || value.handle || value.url || "Single item",
        type: value.documentId ? "relation" : value.url ? "media" : "component"
      }];
    }
    const strValue = String(value);
    return [{
      label: strValue.length > 100 ? strValue.substring(0, 100) + "..." : strValue,
      type: typeof value
    }];
  },
  /**
   * Clear a field from a document using a path
   *
   * Supported field types:
   * - string, text, richtext, enumeration
   * - integer, decimal, float
   * - boolean
   * - CKEditor (customField)
   * - media (single/multiple)
   * - relation (oneToOne, oneToMany, manyToOne, manyToMany)
   * - component (single/repeatable)
   *
   * Examples:
   * - "coupons" → clears entire coupons array (sets to [])
   * - "coupons.freebies" → clears freebies field inside each coupon component
   * - "all_offers_unlocked_message" → clears CKEditor field
   *
   * @param contentType - e.g., 'api::cart.cart'
   * @param documentId - the document's documentId
   * @param fieldPath - e.g., 'coupons' or 'coupons.freebies'
   */
  async clearField(contentType, documentId, fieldPath) {
    if (!contentType || typeof contentType !== "string") {
      throw new Error("Invalid contentType provided");
    }
    if (documentId && typeof documentId !== "string") {
      throw new Error("Invalid documentId provided");
    }
    if (!fieldPath || typeof fieldPath !== "string") {
      throw new Error("Invalid fieldPath provided");
    }
    const trimmedPath = fieldPath.trim();
    if (!trimmedPath) {
      throw new Error("Field path cannot be empty");
    }
    const { fieldName, nestedField, deepNestedField, indices } = parseFieldPath(trimmedPath);
    if (!fieldName) {
      throw new Error("Field path cannot be empty");
    }
    if (!nestedField) {
      return this.clearTopLevelField(contentType, documentId, fieldName);
    }
    if (deepNestedField) {
      return this.clearDeepNestedField(contentType, documentId, fieldName, nestedField, deepNestedField, indices);
    }
    return this.clearNestedField(contentType, documentId, fieldName, nestedField, indices);
  },
  /**
   * Clear a top-level field (e.g., "coupons" → sets coupons to [] or null)
   * Works for all field types: relations, components, scalars, media, CKEditor
   */
  async clearTopLevelField(contentType, documentId, fieldName) {
    if (!fieldName || typeof fieldName !== "string") {
      throw new Error("Invalid field name provided");
    }
    let document;
    try {
      document = await this.fetchDocument(contentType, documentId, "*");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch document: ${message}`);
    }
    if (!document) {
      throw new Error("Document not found");
    }
    const fieldValue = document[fieldName];
    if (fieldValue === void 0) {
      throw new Error(`Field "${fieldName}" does not exist on this content type`);
    }
    const isEmpty = this.isFieldEmpty(fieldValue);
    if (isEmpty) {
      return { message: `Field "${fieldName}" is already empty`, clearedCount: 0 };
    }
    const clearedCount = this.countFieldItems(fieldValue);
    const newValue = this.getEmptyValue(fieldValue);
    const docId = document.documentId || documentId;
    try {
      if (docId) {
        await strapi.documents(contentType).update({
          documentId: docId,
          data: {
            [fieldName]: newValue
          }
        });
      } else {
        const internalId = document.id;
        if (!internalId) {
          throw new Error("Document internal ID not found");
        }
        await strapi.entityService.update(contentType, internalId, {
          data: {
            [fieldName]: newValue
          }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to update document: ${message}`);
    }
    return {
      message: `Successfully cleared "${fieldName}" (${clearedCount} item${clearedCount !== 1 ? "s" : ""})`,
      clearedCount,
      path: fieldName
    };
  },
  /**
   * Clear a nested field inside component(s) (e.g., "coupons.freebies" or "coupons[1].freebies")
   * Works for all field types inside components
   * @param indices - Optional array of component indices to target (0-based). If null, targets all components.
   */
  async clearNestedField(contentType, documentId, componentField, nestedField, indices = null) {
    if (!componentField || typeof componentField !== "string") {
      throw new Error("Invalid component field name provided");
    }
    if (!nestedField || typeof nestedField !== "string") {
      throw new Error("Invalid nested field name provided");
    }
    const populate = {
      [componentField]: {
        populate: {
          [nestedField]: true
        }
      }
    };
    let document;
    try {
      document = await this.fetchDocumentWithPublishedFallback(contentType, documentId, populate);
    } catch (error) {
      try {
        document = await this.fetchDocument(contentType, documentId, {
          [componentField]: {
            populate: "*"
          }
        });
      } catch (finalError) {
        const message = finalError instanceof Error ? finalError.message : "Unknown error";
        throw new Error(`Failed to fetch document: ${message}`);
      }
    }
    if (!document) {
      throw new Error("Document not found");
    }
    const components = document[componentField];
    const displayPath = indices ? `${componentField}[${indices.join(",")}].${nestedField}` : `${componentField}.${nestedField}`;
    if (components === void 0) {
      throw new Error(`Field "${componentField}" does not exist on this content type`);
    }
    if (components === null) {
      return { message: `"${componentField}" is null on this document`, clearedCount: 0 };
    }
    if (Array.isArray(components) && components.length === 0) {
      return { message: `No "${componentField}" found on this document`, clearedCount: 0 };
    }
    const componentArray = Array.isArray(components) ? components : [components];
    const isRepeatable = Array.isArray(components);
    if (indices) {
      for (const idx of indices) {
        if (idx < 0 || idx >= componentArray.length) {
          throw new Error(`Index ${idx} is out of range. "${componentField}" has ${componentArray.length} item${componentArray.length !== 1 ? "s" : ""} (indices 0-${componentArray.length - 1})`);
        }
      }
    }
    const targetIndices = indices ? new Set(indices) : null;
    for (let i = 0; i < componentArray.length; i++) {
      const comp = componentArray[i];
      if (!comp || typeof comp !== "object") {
        throw new Error(`Invalid component structure at index ${i}`);
      }
      if (!comp.id) {
        throw new Error(`Component at index ${i} is missing required 'id' field`);
      }
    }
    let totalCleared = 0;
    let nestedFieldExists = false;
    for (let i = 0; i < componentArray.length; i++) {
      const comp = componentArray[i];
      if (targetIndices && !targetIndices.has(i)) continue;
      if (comp && comp[nestedField] !== void 0) {
        nestedFieldExists = true;
        const items = comp[nestedField];
        totalCleared += this.countFieldItems(items);
      }
    }
    if (!nestedFieldExists) {
      throw new Error(`Field "${nestedField}" does not exist inside "${componentField}"`);
    }
    const targetDescription = indices ? `${indices.length} selected "${componentField}"` : `${componentArray.length} "${componentField}"`;
    if (totalCleared === 0) {
      return {
        message: `"${nestedField}" is already empty in ${targetDescription}`,
        clearedCount: 0
      };
    }
    componentArray.some((comp) => comp && comp.__component);
    const updatedComponents = componentArray.map((comp, idx) => {
      if (!comp) return null;
      const updated = { id: comp.id };
      if (comp.__component) {
        updated.__component = comp.__component;
      }
      for (const [key, value] of Object.entries(comp)) {
        if (key === "id" || key === "__component") {
          continue;
        }
        if (key === nestedField && (!targetIndices || targetIndices.has(idx))) {
          continue;
        }
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
          updated[key] = value;
        }
      }
      if (!targetIndices || targetIndices.has(idx)) {
        const originalValue = comp[nestedField];
        updated[nestedField] = this.getEmptyValue(originalValue);
      } else {
        const originalValue = comp[nestedField];
        if (Array.isArray(originalValue)) {
          updated[nestedField] = originalValue.map((item) => {
            if (item && typeof item === "object") {
              return item.documentId ? { documentId: item.documentId } : { id: item.id };
            }
            return item;
          });
        } else if (originalValue && typeof originalValue === "object") {
          updated[nestedField] = originalValue.documentId ? { documentId: originalValue.documentId } : { id: originalValue.id };
        } else {
          updated[nestedField] = originalValue;
        }
      }
      return updated;
    }).filter(Boolean);
    const updateData = isRepeatable ? updatedComponents : updatedComponents[0];
    const docId = document.documentId || documentId;
    try {
      if (docId) {
        await strapi.documents(contentType).update({
          documentId: docId,
          data: {
            [componentField]: updateData
          }
        });
      } else {
        const internalId = document.id;
        if (!internalId) {
          throw new Error("Document internal ID not found");
        }
        await strapi.entityService.update(contentType, internalId, {
          data: {
            [componentField]: updateData
          }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to update document: ${message}`);
    }
    return {
      message: `Successfully cleared "${nestedField}" from ${targetDescription} (${totalCleared} item${totalCleared !== 1 ? "s" : ""})`,
      clearedCount: totalCleared,
      path: displayPath
    };
  },
  /**
   * Clear a deep nested field inside component(s) within a parent field
   * (e.g., "blocks[0].items.subfield" - clear subfield inside items inside first block)
   * Works for dynamic zones and repeatable components with nested components
   */
  async clearDeepNestedField(contentType, documentId, parentField, componentField, nestedField, indices = null) {
    if (!parentField || !componentField || !nestedField) {
      throw new Error("Invalid field path provided");
    }
    const populate = {
      [parentField]: {
        populate: {
          [componentField]: {
            populate: {
              [nestedField]: true
            }
          }
        }
      }
    };
    let document;
    try {
      document = await this.fetchDocumentWithPublishedFallback(contentType, documentId, populate);
    } catch (error) {
      try {
        document = await this.fetchDocument(contentType, documentId, {
          [parentField]: {
            populate: {
              [componentField]: {
                populate: "*"
              }
            }
          }
        });
      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : "Unknown error";
        throw new Error(`Failed to fetch document: ${message}`);
      }
    }
    if (!document) {
      throw new Error("Document not found");
    }
    const parentComponents = document[parentField];
    const displayPath = indices ? `${parentField}[${indices.join(",")}].${componentField}.${nestedField}` : `${parentField}.${componentField}.${nestedField}`;
    if (parentComponents === void 0) {
      throw new Error(`Field "${parentField}" does not exist on this content type`);
    }
    if (parentComponents === null || Array.isArray(parentComponents) && parentComponents.length === 0) {
      return { message: `"${parentField}" is empty on this document`, clearedCount: 0 };
    }
    const parentArray = Array.isArray(parentComponents) ? parentComponents : [parentComponents];
    const isRepeatable = Array.isArray(parentComponents);
    if (indices) {
      for (const idx of indices) {
        if (idx < 0 || idx >= parentArray.length) {
          throw new Error(`Index ${idx} is out of range. "${parentField}" has ${parentArray.length} item${parentArray.length !== 1 ? "s" : ""} (indices 0-${parentArray.length - 1})`);
        }
      }
    }
    const targetIndices = indices ? new Set(indices) : null;
    let totalCleared = 0;
    let fieldExists = false;
    for (let i = 0; i < parentArray.length; i++) {
      if (targetIndices && !targetIndices.has(i)) continue;
      const parentComp = parentArray[i];
      if (!parentComp) continue;
      const subComponent = parentComp[componentField];
      if (subComponent === void 0) continue;
      const subArray = Array.isArray(subComponent) ? subComponent : subComponent ? [subComponent] : [];
      for (const sub of subArray) {
        if (sub && sub[nestedField] !== void 0) {
          fieldExists = true;
          totalCleared += this.countFieldItems(sub[nestedField]);
        }
      }
    }
    if (!fieldExists) {
      throw new Error(`Field "${nestedField}" does not exist inside "${parentField}.${componentField}"`);
    }
    const targetDescription = indices ? `${indices.length} selected "${parentField}"` : `${parentArray.length} "${parentField}"`;
    if (totalCleared === 0) {
      return {
        message: `"${nestedField}" is already empty in ${targetDescription}`,
        clearedCount: 0
      };
    }
    const updatedParentComponents = parentArray.map((parentComp, idx) => {
      if (!parentComp) return null;
      const updated = { id: parentComp.id };
      if (parentComp.__component) {
        updated.__component = parentComp.__component;
      }
      for (const [key, value] of Object.entries(parentComp)) {
        if (key === "id" || key === "__component") continue;
        if (key === componentField) continue;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
          updated[key] = value;
        }
      }
      const subComponent = parentComp[componentField];
      const isTargeted = !targetIndices || targetIndices.has(idx);
      if (!isTargeted || subComponent === void 0 || subComponent === null) {
        if (subComponent === void 0 || subComponent === null) {
          updated[componentField] = subComponent;
        } else if (Array.isArray(subComponent)) {
          updated[componentField] = subComponent.map((item) => {
            if (item && typeof item === "object") {
              return item.documentId ? { documentId: item.documentId } : { id: item.id };
            }
            return item;
          });
        } else if (typeof subComponent === "object") {
          updated[componentField] = subComponent.documentId ? { documentId: subComponent.documentId } : { id: subComponent.id };
        } else {
          updated[componentField] = subComponent;
        }
      } else {
        const subArray = Array.isArray(subComponent) ? subComponent : [subComponent];
        const isSubRepeatable = Array.isArray(subComponent);
        const updatedSubs = subArray.map((sub) => {
          if (!sub || typeof sub !== "object") return sub;
          const updatedSub = { id: sub.id };
          if (sub.__component) {
            updatedSub.__component = sub.__component;
          }
          for (const [key, value] of Object.entries(sub)) {
            if (key === "id" || key === "__component") continue;
            if (key === nestedField) continue;
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
              updatedSub[key] = value;
            }
          }
          if (sub[nestedField] !== void 0) {
            updatedSub[nestedField] = this.getEmptyValue(sub[nestedField]);
          }
          return updatedSub;
        });
        updated[componentField] = isSubRepeatable ? updatedSubs : updatedSubs[0];
      }
      return updated;
    }).filter(Boolean);
    const updateData = isRepeatable ? updatedParentComponents : updatedParentComponents[0];
    const docId = document.documentId || documentId;
    try {
      if (docId) {
        await strapi.documents(contentType).update({
          documentId: docId,
          data: {
            [parentField]: updateData
          }
        });
      } else {
        const internalId = document.id;
        if (!internalId) {
          throw new Error("Document internal ID not found");
        }
        await strapi.entityService.update(contentType, internalId, {
          data: {
            [parentField]: updateData
          }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to update document: ${message}`);
    }
    return {
      message: `Successfully cleared "${nestedField}" from "${componentField}" across ${targetDescription} (${totalCleared} item${totalCleared !== 1 ? "s" : ""})`,
      clearedCount: totalCleared,
      path: displayPath
    };
  },
  /**
   * Check if a field value is considered empty
   */
  isFieldEmpty(value) {
    if (value === null || value === void 0) {
      return true;
    }
    if (typeof value === "string" && value.trim() === "") {
      return true;
    }
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
      return true;
    }
    return false;
  },
  /**
   * Count items in a field for reporting
   */
  countFieldItems(value) {
    if (value === null || value === void 0) {
      return 0;
    }
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === "string" && value.trim() === "") {
      return 0;
    }
    if (typeof value === "object" && Object.keys(value).length === 0) {
      return 0;
    }
    return 1;
  },
  /**
   * Get the appropriate empty value based on the original value type
   */
  getEmptyValue(value) {
    if (Array.isArray(value)) {
      return [];
    }
    return null;
  }
});
const services = {
  service
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares
};
module.exports = index;
