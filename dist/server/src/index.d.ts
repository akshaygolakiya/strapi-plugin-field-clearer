declare const _default: {
    register: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    destroy: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    config: {
        default: {
            allowedContentTypes: string[];
        };
        validator(config: {
            allowedContentTypes?: unknown;
        }): void;
    };
    controllers: {
        controller: ({ strapi }: {
            strapi: import("@strapi/types/dist/core").Strapi;
        }) => {
            getConfig(ctx: any): Promise<any>;
            previewField(ctx: any): Promise<any>;
            clearField(ctx: any): Promise<any>;
        };
    };
    routes: {
        method: string;
        path: string;
        handler: string;
        config: {
            policies: string[];
        };
    }[];
    services: {
        service: ({ strapi }: {
            strapi: import("@strapi/types/dist/core").Strapi;
        }) => {
            fetchDocument(contentType: string, documentId: string, populate: any, status?: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
            fetchDocumentWithPublishedFallback(contentType: string, documentId: string, populate: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
            previewField(contentType: string, documentId: string, fieldPath: string): Promise<{
                fieldPath: string;
                fieldType: string;
                isEmpty: boolean;
                itemCount: number;
                items: any[];
                message: string;
            }>;
            previewTopLevelField(contentType: string, documentId: string, fieldName: string): Promise<{
                fieldPath: string;
                fieldType: string;
                isEmpty: boolean;
                itemCount: number;
                items: any[];
                message: string;
            }>;
            previewNestedField(contentType: string, documentId: string, componentField: string, nestedField: string, indices?: number[]): Promise<{
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
            previewDeepNestedField(contentType: string, documentId: string, parentField: string, componentField: string, nestedField: string, indices?: number[]): Promise<{
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
            getFieldType(value: any): string;
            extractPreviewItems(value: any, fieldName: string): any[];
            clearField(contentType: string, documentId: string, fieldPath: string): Promise<{
                message: string;
                clearedCount: number;
                path?: undefined;
            } | {
                message: string;
                clearedCount: number;
                path: string;
            }>;
            clearTopLevelField(contentType: string, documentId: string, fieldName: string): Promise<{
                message: string;
                clearedCount: number;
                path?: undefined;
            } | {
                message: string;
                clearedCount: number;
                path: string;
            }>;
            clearNestedField(contentType: string, documentId: string, componentField: string, nestedField: string, indices?: number[]): Promise<{
                message: string;
                clearedCount: number;
                path?: undefined;
            } | {
                message: string;
                clearedCount: number;
                path: string;
            }>;
            clearDeepNestedField(contentType: string, documentId: string, parentField: string, componentField: string, nestedField: string, indices?: number[]): Promise<{
                message: string;
                clearedCount: number;
                path?: undefined;
            } | {
                message: string;
                clearedCount: number;
                path: string;
            }>;
            isFieldEmpty(value: any): boolean;
            countFieldItems(value: any): number;
            getEmptyValue(value: any): any;
        };
    };
    contentTypes: {};
    policies: {};
    middlewares: {};
};
export default _default;
