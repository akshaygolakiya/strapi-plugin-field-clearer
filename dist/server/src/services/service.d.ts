import type { Core } from '@strapi/strapi';
declare const service: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * Fetch a document by documentId, or use findFirst() for single types when documentId is empty.
     * Optionally specify status ('published' or 'draft') - defaults to Strapi's default (draft in admin context).
     */
    fetchDocument(contentType: string, documentId: string, populate: any, status?: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    /**
     * Smart fetch for reading relation data: tries published version first (which has complete
     * relation data), then falls back to draft. This works around the Strapi v5 draft/publish
     * issue where relation join tables can have mixed draft/published product IDs, causing the
     * draft version to return incomplete relations.
     */
    fetchDocumentWithPublishedFallback(contentType: string, documentId: string, populate: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    /**
     * Preview what will be deleted (dry run - no actual deletion)
     * Returns field info and items that would be deleted
     */
    previewField(contentType: string, documentId: string, fieldPath: string): Promise<{
        fieldPath: string;
        fieldType: string;
        isEmpty: boolean;
        itemCount: number;
        items: any[];
        message: string;
    }>;
    /**
     * Preview a top-level field deletion
     */
    previewTopLevelField(contentType: string, documentId: string, fieldName: string): Promise<{
        fieldPath: string;
        fieldType: string;
        isEmpty: boolean;
        itemCount: number;
        items: any[];
        message: string;
    }>;
    /**
     * Preview a nested field deletion
     * @param indices - Optional array of component indices to target (0-based). If null, targets all components.
     */
    previewNestedField(contentType: string, documentId: string, componentField: string, nestedField: string, indices?: number[] | null): Promise<{
        fieldPath: string;
        fieldType: string;
        isEmpty: boolean;
        itemCount: number;
        items: any[];
        message: string;
        componentCount?: undefined;
        totalComponentCount?: undefined;
        targetIndices?: undefined;
    } | {
        fieldPath: string;
        fieldType: string;
        isEmpty: boolean;
        itemCount: number;
        componentCount: number;
        totalComponentCount: number;
        targetIndices: number[];
        items: any[];
        message: string;
    }>;
    /**
     * Preview a deep nested field deletion (3 levels: e.g., "blocks[0].items.subfield")
     * Used for fields inside components within dynamic zones or repeatable components
     */
    previewDeepNestedField(contentType: string, documentId: string, parentField: string, componentField: string, nestedField: string, indices?: number[] | null): Promise<{
        fieldPath: string;
        fieldType: string;
        isEmpty: boolean;
        itemCount: number;
        items: any[];
        message: string;
        componentCount?: undefined;
        totalComponentCount?: undefined;
        targetIndices?: undefined;
    } | {
        fieldPath: string;
        fieldType: string;
        isEmpty: boolean;
        itemCount: number;
        componentCount: number;
        totalComponentCount: number;
        targetIndices: number[];
        items: any[];
        message: string;
    }>;
    /**
     * Get a human-readable field type
     */
    getFieldType(value: any): string;
    /**
     * Extract preview items from a field value
     */
    extractPreviewItems(value: any, fieldName: string): any[];
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
    clearField(contentType: string, documentId: string, fieldPath: string): Promise<{
        message: string;
        clearedCount: number;
        path?: undefined;
    } | {
        message: string;
        clearedCount: number;
        path: string;
    }>;
    /**
     * Clear a top-level field (e.g., "coupons" → sets coupons to [] or null)
     * Works for all field types: relations, components, scalars, media, CKEditor
     */
    clearTopLevelField(contentType: string, documentId: string, fieldName: string): Promise<{
        message: string;
        clearedCount: number;
        path?: undefined;
    } | {
        message: string;
        clearedCount: number;
        path: string;
    }>;
    /**
     * Clear a nested field inside component(s) (e.g., "coupons.freebies" or "coupons[1].freebies")
     * Works for all field types inside components
     * @param indices - Optional array of component indices to target (0-based). If null, targets all components.
     */
    clearNestedField(contentType: string, documentId: string, componentField: string, nestedField: string, indices?: number[] | null): Promise<{
        message: string;
        clearedCount: number;
        path?: undefined;
    } | {
        message: string;
        clearedCount: number;
        path: string;
    }>;
    /**
     * Clear a deep nested field inside component(s) within a parent field
     * (e.g., "blocks[0].items.subfield" - clear subfield inside items inside first block)
     * Works for dynamic zones and repeatable components with nested components
     */
    clearDeepNestedField(contentType: string, documentId: string, parentField: string, componentField: string, nestedField: string, indices?: number[] | null): Promise<{
        message: string;
        clearedCount: number;
        path?: undefined;
    } | {
        message: string;
        clearedCount: number;
        path: string;
    }>;
    /**
     * Check if a field value is considered empty
     */
    isFieldEmpty(value: any): boolean;
    /**
     * Count items in a field for reporting
     */
    countFieldItems(value: any): number;
    /**
     * Get the appropriate empty value based on the original value type
     */
    getEmptyValue(value: any): any;
};
export default service;
