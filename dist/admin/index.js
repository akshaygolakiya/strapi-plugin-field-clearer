"use strict";
const react = require("react");
const icons = require("@strapi/icons");
const designSystem = require("@strapi/design-system");
const strapiAdmin = require("@strapi/admin/strapi-admin");
const __variableDynamicImportRuntimeHelper = (glob, path, segs) => {
  const v = glob[path];
  if (v) {
    return typeof v === "function" ? v() : Promise.resolve(v);
  }
  return new Promise((_, reject) => {
    (typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(
      reject.bind(
        null,
        new Error(
          "Unknown variable dynamic import: " + path + (path.split("/").length !== segs ? ". Note that variables only represent file names one level deep." : "")
        )
      )
    );
  });
};
const PLUGIN_ID = "field-clearer";
const Initializer = ({ setPlugin }) => {
  const ref = react.useRef(setPlugin);
  react.useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);
  return null;
};
const FAVORITES_STORAGE_KEY = "field-clearer-favorites";
const ClearFieldModalContent = ({
  contentType,
  documentId
}) => {
  const { get, post } = strapiAdmin.useFetchClient();
  const [inputValue, setInputValue] = react.useState("");
  const [loading, setLoading] = react.useState(false);
  const [preview, setPreview] = react.useState(null);
  const [result, setResult] = react.useState(null);
  const [bulkMode, setBulkMode] = react.useState(false);
  const [bulkFields, setBulkFields] = react.useState([]);
  const [bulkProcessing, setBulkProcessing] = react.useState(false);
  const [favorites, setFavorites] = react.useState([]);
  const [validatingFavorite, setValidatingFavorite] = react.useState(false);
  react.useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch {
    }
  }, []);
  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch {
    }
  };
  const addToFavorites = async (path) => {
    if (favorites.includes(path)) return;
    setValidatingFavorite(true);
    setResult(null);
    try {
      const { data } = await post("/field-clearer/preview-field", {
        contentType,
        documentId,
        fieldPath: path
      });
      saveFavorites([...favorites, path]);
      setResult({
        message: `"${path}" added to favorites`,
        type: "success"
      });
      setTimeout(() => setResult(null), 2e3);
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || "Invalid field path";
      setResult({
        message: `Cannot add to favorites: ${message}`,
        type: "error"
      });
    } finally {
      setValidatingFavorite(false);
    }
  };
  const removeFromFavorites = (path) => {
    saveFavorites(favorites.filter((f) => f !== path));
  };
  const isFavorite = (path) => favorites.includes(path);
  const handlePreview = async (path) => {
    const fieldPath = inputValue.trim();
    if (!fieldPath) return;
    setLoading(true);
    setResult(null);
    setPreview(null);
    try {
      const { data } = await post("/field-clearer/preview-field", {
        contentType,
        documentId,
        fieldPath
      });
      setPreview(data);
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || "Failed to preview field";
      setResult({
        message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleClear = async (path, skipReload) => {
    const fieldPath = (path || inputValue).trim();
    if (!fieldPath) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await post("/field-clearer/clear-field", {
        contentType,
        documentId,
        fieldPath
      });
      if (!skipReload) {
        setResult({ message: data.message, type: "success" });
        setPreview(null);
        setTimeout(() => window.location.reload(), 1500);
      }
      return { success: true, message: data.message };
    } catch (error) {
      const message = error?.response?.data?.error?.message || error?.message || "Failed to clear field";
      if (!skipReload) {
        setResult({ message, type: "error" });
      }
      return { success: false, message };
    } finally {
      if (!skipReload) {
        setLoading(false);
      }
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && inputValue.trim() && !loading) {
      e.preventDefault();
      if (bulkMode) {
        handleAddToBulk();
      } else {
        handlePreview();
      }
    }
  };
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setResult(null);
    setPreview(null);
  };
  const handleAddToBulk = () => {
    const path = inputValue.trim();
    if (!path || bulkFields.some((f) => f.path === path)) return;
    setBulkFields([...bulkFields, { path, selected: true }]);
    setInputValue("");
  };
  const handleRemoveFromBulk = (path) => {
    setBulkFields(bulkFields.filter((f) => f.path !== path));
  };
  const handleToggleBulkSelect = (path) => {
    setBulkFields(bulkFields.map((f) => f.path === path ? { ...f, selected: !f.selected } : f));
  };
  const handleBulkPreview = async () => {
    setBulkProcessing(true);
    const selectedFields = bulkFields.filter((f) => f.selected);
    for (const field of selectedFields) {
      try {
        const { data } = await post("/field-clearer/preview-field", {
          contentType,
          documentId,
          fieldPath: field.path
        });
        setBulkFields(
          (prev) => prev.map((f) => f.path === field.path ? { ...f, preview: data } : f)
        );
      } catch {
      }
    }
    setBulkProcessing(false);
  };
  const handleBulkClear = async () => {
    setBulkProcessing(true);
    const selectedFields = bulkFields.filter((f) => f.selected);
    for (const field of selectedFields) {
      setBulkFields(
        (prev) => prev.map((f) => f.path === field.path ? { ...f, status: "clearing" } : f)
      );
      const result2 = await handleClear(field.path, true);
      setBulkFields(
        (prev) => prev.map(
          (f) => f.path === field.path ? { ...f, status: result2?.success ? "success" : "error", error: result2?.success ? void 0 : result2?.message } : f
        )
      );
    }
    setBulkProcessing(false);
    setTimeout(() => window.location.reload(), 2e3);
  };
  const selectedCount = bulkFields.filter((f) => f.selected).length;
  if (bulkMode) {
    return react.createElement(
      designSystem.Box,
      { padding: 4 },
      react.createElement(
        designSystem.Flex,
        { justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
        react.createElement(designSystem.Typography, { variant: "omega", fontWeight: "bold" }, "Bulk Clear Mode"),
        react.createElement(designSystem.Button, { variant: "tertiary", size: "S", onClick: () => setBulkMode(false) }, "Single Mode")
      ),
      react.createElement(
        designSystem.Flex,
        { gap: 2 },
        react.createElement(designSystem.TextInput, {
          placeholder: "e.g., field, field.nested, blocks[0].items.subfield",
          value: inputValue,
          onChange: handleInputChange,
          onKeyDown: handleKeyDown,
          disabled: bulkProcessing,
          "aria-label": "Field path",
          style: { flex: 1 }
        }),
        react.createElement(
          designSystem.Button,
          { variant: "secondary", onClick: handleAddToBulk, disabled: !inputValue.trim() || bulkProcessing, startIcon: react.createElement(icons.Plus) },
          "Add"
        )
      ),
      // Favorites in bulk mode
      favorites.length > 0 && react.createElement(
        designSystem.Box,
        { marginTop: 3, padding: 3, background: "neutral100", hasRadius: true },
        react.createElement(
          designSystem.Flex,
          { gap: 1, alignItems: "center", marginBottom: 2 },
          react.createElement(icons.Star, { fill: "warning500", width: 14, height: 14 }),
          react.createElement(designSystem.Typography, { variant: "pi", fontWeight: "bold" }, "Quick Add from Favorites")
        ),
        react.createElement(
          designSystem.Flex,
          { gap: 2, wrap: "wrap" },
          ...favorites.map(
            (fav) => react.createElement(
              designSystem.Button,
              {
                key: fav,
                variant: bulkFields.some((f) => f.path === fav) ? "default" : "tertiary",
                size: "S",
                onClick: () => {
                  if (!bulkFields.some((f) => f.path === fav)) {
                    setBulkFields([...bulkFields, { path: fav, selected: true }]);
                  }
                },
                disabled: bulkProcessing || bulkFields.some((f) => f.path === fav)
              },
              fav
            )
          )
        )
      ),
      bulkFields.length > 0 && react.createElement(
        designSystem.Box,
        { marginTop: 4, padding: 3, background: "neutral100", hasRadius: true },
        react.createElement(designSystem.Typography, { variant: "pi", fontWeight: "bold", marginBottom: 2 }, `Fields to clear (${selectedCount} selected)`),
        ...bulkFields.map(
          (field) => react.createElement(
            designSystem.Box,
            {
              key: field.path,
              padding: 2,
              marginTop: 1,
              background: field.status === "success" ? "success100" : field.status === "error" ? "danger100" : "neutral0",
              hasRadius: true
            },
            react.createElement(
              designSystem.Flex,
              { justifyContent: "space-between", alignItems: "center" },
              react.createElement(
                designSystem.Flex,
                { gap: 2, alignItems: "center" },
                react.createElement(designSystem.Checkbox, {
                  checked: field.selected,
                  onCheckedChange: () => handleToggleBulkSelect(field.path),
                  disabled: bulkProcessing
                }),
                react.createElement(
                  designSystem.Box,
                  null,
                  react.createElement(designSystem.Typography, { variant: "pi", fontWeight: "bold" }, field.path),
                  field.preview && react.createElement(
                    designSystem.Typography,
                    { variant: "pi", textColor: "neutral600" },
                    field.preview.isEmpty ? "Empty" : `${field.preview.itemCount} item${field.preview.itemCount !== 1 ? "s" : ""}`
                  ),
                  field.status === "success" && react.createElement(designSystem.Typography, { variant: "pi", textColor: "success600" }, "Cleared!"),
                  field.status === "error" && react.createElement(designSystem.Typography, { variant: "pi", textColor: "danger600" }, field.error)
                )
              ),
              react.createElement(
                designSystem.Button,
                { variant: "ghost", size: "S", onClick: () => handleRemoveFromBulk(field.path), disabled: bulkProcessing },
                react.createElement(icons.Cross, { fill: "neutral500", width: 16, height: 16 })
              )
            )
          )
        )
      ),
      bulkFields.length > 0 && react.createElement(
        designSystem.Flex,
        { gap: 2, marginTop: 4 },
        react.createElement(
          designSystem.Button,
          {
            variant: "secondary",
            onClick: handleBulkPreview,
            disabled: selectedCount === 0 || bulkProcessing,
            loading: bulkProcessing,
            style: { flex: 1 },
            startIcon: react.createElement(icons.Eye)
          },
          "Preview All"
        ),
        react.createElement(
          designSystem.Button,
          {
            variant: "danger",
            onClick: handleBulkClear,
            disabled: selectedCount === 0 || bulkProcessing,
            loading: bulkProcessing,
            style: { flex: 1 }
          },
          `Clear ${selectedCount} Field${selectedCount !== 1 ? "s" : ""}`
        )
      )
    );
  }
  return react.createElement(
    designSystem.Box,
    { padding: 4 },
    react.createElement(
      designSystem.Flex,
      { justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
      react.createElement(designSystem.Typography, { variant: "omega", fontWeight: "bold" }, "Enter field path to clear:"),
      react.createElement(designSystem.Button, { variant: "tertiary", size: "S", onClick: () => setBulkMode(true) }, "Bulk Mode")
    ),
    react.createElement(designSystem.TextInput, {
      placeholder: "e.g., field, field.nested, blocks[0].items.subfield",
      value: inputValue,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      disabled: loading,
      "aria-label": "Field path"
    }),
    // Favorites section
    favorites.length > 0 && !preview && !result && react.createElement(
      designSystem.Box,
      { marginTop: 3, padding: 3, background: "neutral100", hasRadius: true },
      react.createElement(
        designSystem.Flex,
        { justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
        react.createElement(
          designSystem.Flex,
          { gap: 1, alignItems: "center" },
          react.createElement(icons.Star, { fill: "warning500", width: 14, height: 14 }),
          react.createElement(designSystem.Typography, { variant: "pi", fontWeight: "bold" }, "Favorites")
        )
      ),
      react.createElement(
        designSystem.Flex,
        { gap: 2, wrap: "wrap" },
        ...favorites.map(
          (fav) => react.createElement(
            designSystem.Flex,
            { key: fav, gap: 1, alignItems: "center" },
            react.createElement(
              designSystem.Button,
              {
                variant: "tertiary",
                size: "S",
                onClick: () => setInputValue(fav),
                disabled: loading
              },
              fav
            ),
            react.createElement(
              designSystem.Button,
              {
                variant: "ghost",
                size: "S",
                onClick: () => removeFromFavorites(fav),
                disabled: loading,
                style: { padding: "4px", minWidth: "auto" }
              },
              react.createElement(icons.Cross, { fill: "neutral500", width: 12, height: 12 })
            )
          )
        )
      )
    ),
    // Add to favorites button (when input has value and not in favorites)
    !preview && inputValue.trim() && !isFavorite(inputValue.trim()) && react.createElement(
      designSystem.Box,
      { marginTop: 2 },
      react.createElement(
        designSystem.Button,
        {
          variant: "ghost",
          size: "S",
          onClick: () => addToFavorites(inputValue.trim()),
          disabled: loading || validatingFavorite,
          loading: validatingFavorite,
          startIcon: react.createElement(icons.Star)
        },
        validatingFavorite ? "Validating..." : "Add to Favorites"
      )
    ),
    // Action buttons
    !preview && !result && inputValue.trim() && react.createElement(
      designSystem.Flex,
      { gap: 2, marginTop: 4 },
      react.createElement(
        designSystem.Button,
        { variant: "secondary", onClick: () => handlePreview(), disabled: loading, loading, style: { flex: 1 }, startIcon: react.createElement(icons.Eye) },
        "Preview"
      ),
      react.createElement(designSystem.Button, { variant: "danger", onClick: () => handleClear(), disabled: loading, style: { flex: 1 } }, "Clear Now")
    ),
    // Preview results
    preview && !result && react.createElement(
      designSystem.Box,
      { marginTop: 4 },
      react.createElement(
        designSystem.Box,
        { padding: 3, background: "neutral100", hasRadius: true, marginBottom: 3 },
        react.createElement(designSystem.Typography, { variant: "omega", fontWeight: "bold" }, `Field: ${preview.fieldPath}`),
        react.createElement(designSystem.Box, { marginTop: 1 }, react.createElement(designSystem.Typography, { variant: "pi", textColor: "neutral600" }, `Type: ${preview.fieldType}`)),
        react.createElement(
          designSystem.Box,
          { marginTop: 1 },
          react.createElement(designSystem.Typography, { variant: "pi", textColor: preview.isEmpty ? "neutral600" : "danger600", fontWeight: "bold" }, preview.message)
        )
      ),
      !preview.isEmpty && preview.items.length > 0 && react.createElement(
        designSystem.Box,
        { padding: 3, background: "danger100", hasRadius: true, marginBottom: 3, style: { maxHeight: "200px", overflowY: "auto" } },
        react.createElement(designSystem.Typography, { variant: "pi", fontWeight: "bold", textColor: "danger700" }, "Items to be deleted:"),
        react.createElement(
          designSystem.Box,
          { marginTop: 2 },
          ...preview.items.slice(0, 20).map(
            (item, idx) => react.createElement(
              designSystem.Box,
              { key: idx, marginTop: 1 },
              react.createElement(
                designSystem.Typography,
                { variant: "pi", textColor: "danger600" },
                item.componentHandle ? `• [${item.componentHandle}] ${item.label}` : `• ${item.label}`
              )
            )
          ),
          preview.items.length > 20 && react.createElement(
            designSystem.Box,
            { marginTop: 1 },
            react.createElement(designSystem.Typography, { variant: "pi", textColor: "danger600", fontStyle: "italic" }, `... and ${preview.items.length - 20} more items`)
          )
        )
      ),
      !preview.isEmpty && react.createElement(
        designSystem.Box,
        { padding: 3, background: "danger100", hasRadius: true, marginBottom: 3 },
        react.createElement(
          designSystem.Flex,
          { gap: 2, alignItems: "center" },
          react.createElement(icons.WarningCircle, { fill: "danger600" }),
          react.createElement(designSystem.Typography, { variant: "pi", textColor: "danger600", fontWeight: "bold" }, "This action cannot be undone!")
        )
      ),
      react.createElement(
        designSystem.Flex,
        { gap: 2 },
        react.createElement(designSystem.Button, { variant: "tertiary", onClick: () => setPreview(null), disabled: loading, style: { flex: 1 } }, "Cancel"),
        !preview.isEmpty && react.createElement(
          designSystem.Button,
          { variant: "danger", onClick: () => handleClear(), disabled: loading, loading, style: { flex: 1 } },
          "Confirm Delete"
        )
      )
    ),
    // Result message
    result && react.createElement(
      designSystem.Box,
      { marginTop: 3, padding: 3, background: result.type === "success" ? "success100" : "danger100", hasRadius: true },
      react.createElement(
        designSystem.Flex,
        { gap: 2, alignItems: "center" },
        result.type === "success" ? react.createElement(icons.Check, { fill: "success600" }) : react.createElement(icons.Cross, { fill: "danger600" }),
        react.createElement(designSystem.Typography, { textColor: result.type === "success" ? "success700" : "danger700" }, result.message)
      )
    )
  );
};
const index = {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: "Field Clearer"
    });
  },
  bootstrap(app) {
    const contentManagerApis = app.getPlugin("content-manager").apis;
    const ClearFieldAction = ({ model, documentId, collectionType }) => {
      const isSingleType = collectionType === "single-types";
      if (!documentId && !isSingleType) {
        return null;
      }
      return {
        label: "Clear Field",
        icon: react.createElement(icons.Trash),
        variant: "danger",
        position: "panel",
        dialog: {
          type: "modal",
          title: "Clear Field Data",
          content: react.createElement(ClearFieldModalContent, { contentType: model, documentId: documentId || "" })
        }
      };
    };
    contentManagerApis.addDocumentAction([ClearFieldAction]);
  },
  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/en.json": () => Promise.resolve().then(() => require("../_chunks/en-B9h9Fs9u.js")) }), `./translations/${locale}.json`, 3);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  }
};
module.exports = index;
