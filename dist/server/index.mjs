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
const VALID_FIELD_PATH_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(\[\d+(,\d+)*\])?(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
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
  if (typeof documentId !== "string") {
    return { valid: false, error: "documentId must be a string" };
  }
  const trimmed = documentId.trim();
  if (!trimmed) {
    return { valid: false, error: "documentId cannot be empty" };
  }
  if (trimmed.length > MAX_DOCUMENT_ID_LENGTH) {
    return { valid: false, error: `documentId exceeds maximum length of ${MAX_DOCUMENT_ID_LENGTH}` };
  }
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
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
      const result = await strapi.plugin(PLUGIN_ID).service("service").previewField(contentType, documentId.trim(), fieldPath.trim());
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
      strapi.log.info(`[field-clearer] Clearing field "${fieldPath}" on ${contentType} (documentId: ${documentId})`);
      const result = await strapi.plugin(PLUGIN_ID).service("service").clearField(contentType, documentId.trim(), fieldPath.trim());
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
  const bracketMatch = path.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+(?:,\d+)*)\](?:\.([a-zA-Z_][a-zA-Z0-9_]*))?$/);
  if (bracketMatch) {
    const [, fieldName, indicesStr, nestedField] = bracketMatch;
    const indices = indicesStr.split(",").map(Number);
    return { fieldName, nestedField, indices };
  }
  const parts = path.split(".");
  if (parts.length === 1) {
    return { fieldName: parts[0], indices: null };
  }
  if (parts.length === 2) {
    return { fieldName: parts[0], nestedField: parts[1], indices: null };
  }
  throw new Error(`Invalid path format: "${path}"`);
};
const service = ({ strapi }) => ({
  /**
   * Preview what will be deleted (dry run - no actual deletion)
   * Returns field info and items that would be deleted
   */
  async previewField(contentType, documentId, fieldPath) {
    if (!contentType || typeof contentType !== "string") {
      throw new Error("Invalid contentType provided");
    }
    if (!documentId || typeof documentId !== "string") {
      throw new Error("Invalid documentId provided");
    }
    if (!fieldPath || typeof fieldPath !== "string") {
      throw new Error("Invalid fieldPath provided");
    }
    const trimmedPath = fieldPath.trim();
    if (!trimmedPath) {
      throw new Error("Field path cannot be empty");
    }
    const { fieldName, nestedField, indices } = parseFieldPath(trimmedPath);
    if (!fieldName) {
      throw new Error("Field path cannot be empty");
    }
    if (!nestedField) {
      return this.previewTopLevelField(contentType, documentId, fieldName);
    }
    return this.previewNestedField(contentType, documentId, fieldName, nestedField, indices);
  },
  /**
   * Preview a top-level field deletion
   */
  async previewTopLevelField(contentType, documentId, fieldName) {
    let document;
    try {
      document = await strapi.documents(contentType).findOne({
        documentId,
        populate: "*"
      });
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
    let document;
    try {
      document = await strapi.documents(contentType).findOne({
        documentId,
        populate: {
          [componentField]: {
            populate: "*"
          }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch document: ${message}`);
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
            componentHandle: comp.handle || comp.title || comp.name || `#${i + 1}`
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
          return {
            index: index2,
            id: item.id || item.documentId,
            label: item.title || item.name || item.handle || item.code || item.documentId || `Item ${index2 + 1}`,
            type: item.documentId ? "relation" : "component"
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
    if (!documentId || typeof documentId !== "string") {
      throw new Error("Invalid documentId provided");
    }
    if (!fieldPath || typeof fieldPath !== "string") {
      throw new Error("Invalid fieldPath provided");
    }
    const trimmedPath = fieldPath.trim();
    if (!trimmedPath) {
      throw new Error("Field path cannot be empty");
    }
    const { fieldName, nestedField, indices } = parseFieldPath(trimmedPath);
    if (!fieldName) {
      throw new Error("Field path cannot be empty");
    }
    if (!nestedField) {
      return this.clearTopLevelField(contentType, documentId, fieldName);
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
      document = await strapi.documents(contentType).findOne({
        documentId,
        populate: "*"
      });
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
    const internalId = document.id;
    if (!internalId) {
      throw new Error("Document internal ID not found");
    }
    const newValue = this.getEmptyValue(fieldValue);
    try {
      await strapi.entityService.update(contentType, internalId, {
        data: {
          [fieldName]: newValue
        }
      });
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
    let document;
    try {
      document = await strapi.documents(contentType).findOne({
        documentId,
        populate: {
          [componentField]: {
            populate: "*"
          }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch document: ${message}`);
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
    const updatedComponents = componentArray.map((comp, idx) => {
      if (!comp) return null;
      const updated = { id: comp.id };
      for (const [key, value] of Object.entries(comp)) {
        if (key === "id") {
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
    const internalId = document.id;
    if (!internalId) {
      throw new Error("Document internal ID not found");
    }
    const updateData = isRepeatable ? updatedComponents : updatedComponents[0];
    try {
      await strapi.entityService.update(contentType, internalId, {
        data: {
          [componentField]: updateData
        }
      });
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
export {
  index as default
};
