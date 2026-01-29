declare const _default: {
    controller: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => {
        getConfig(ctx: any): Promise<any>;
        previewField(ctx: any): Promise<any>;
        clearField(ctx: any): Promise<any>;
    };
};
export default _default;
