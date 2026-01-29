import type { Core } from '@strapi/strapi';
declare const controller: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * Get plugin configuration for admin UI
     * GET /field-clearer/config
     */
    getConfig(ctx: any): Promise<any>;
    /**
     * Preview what will be deleted (dry run)
     * POST /field-clearer/preview-field
     * Body: { contentType, documentId, fieldPath }
     */
    previewField(ctx: any): Promise<any>;
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
    clearField(ctx: any): Promise<any>;
};
export default controller;
