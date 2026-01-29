declare const _default: {
    service: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => {
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
        isFieldEmpty(value: any): boolean;
        countFieldItems(value: any): number;
        getEmptyValue(value: any): any;
    };
};
export default _default;
