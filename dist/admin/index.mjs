import { useRef, useEffect, createElement, useState } from "react";
import { Trash, Plus, Star, Cross, Eye, WarningCircle, Check } from "@strapi/icons";
import { Box, Flex, Typography, Button, TextInput, Checkbox } from "@strapi/design-system";
import { useFetchClient } from "@strapi/admin/strapi-admin";
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
  const ref = useRef(setPlugin);
  useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);
  return null;
};
const FAVORITES_STORAGE_KEY = "field-clearer-favorites";
const ClearFieldModalContent = ({
  contentType,
  documentId
}) => {
  const { get, post } = useFetchClient();
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFields, setBulkFields] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [validatingFavorite, setValidatingFavorite] = useState(false);
  useEffect(() => {
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
    return createElement(
      Box,
      { padding: 4 },
      createElement(
        Flex,
        { justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
        createElement(Typography, { variant: "omega", fontWeight: "bold" }, "Bulk Clear Mode"),
        createElement(Button, { variant: "tertiary", size: "S", onClick: () => setBulkMode(false) }, "Single Mode")
      ),
      createElement(
        Flex,
        { gap: 2 },
        createElement(TextInput, {
          placeholder: "e.g., field, field.nested, blocks[0].items.subfield",
          value: inputValue,
          onChange: handleInputChange,
          onKeyDown: handleKeyDown,
          disabled: bulkProcessing,
          "aria-label": "Field path",
          style: { flex: 1 }
        }),
        createElement(
          Button,
          { variant: "secondary", onClick: handleAddToBulk, disabled: !inputValue.trim() || bulkProcessing, startIcon: createElement(Plus) },
          "Add"
        )
      ),
      // Favorites in bulk mode
      favorites.length > 0 && createElement(
        Box,
        { marginTop: 3, padding: 3, background: "neutral100", hasRadius: true },
        createElement(
          Flex,
          { gap: 1, alignItems: "center", marginBottom: 2 },
          createElement(Star, { fill: "warning500", width: 14, height: 14 }),
          createElement(Typography, { variant: "pi", fontWeight: "bold" }, "Quick Add from Favorites")
        ),
        createElement(
          Flex,
          { gap: 2, wrap: "wrap" },
          ...favorites.map(
            (fav) => createElement(
              Button,
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
      bulkFields.length > 0 && createElement(
        Box,
        { marginTop: 4, padding: 3, background: "neutral100", hasRadius: true },
        createElement(Typography, { variant: "pi", fontWeight: "bold", marginBottom: 2 }, `Fields to clear (${selectedCount} selected)`),
        ...bulkFields.map(
          (field) => createElement(
            Box,
            {
              key: field.path,
              padding: 2,
              marginTop: 1,
              background: field.status === "success" ? "success100" : field.status === "error" ? "danger100" : "neutral0",
              hasRadius: true
            },
            createElement(
              Flex,
              { justifyContent: "space-between", alignItems: "center" },
              createElement(
                Flex,
                { gap: 2, alignItems: "center" },
                createElement(Checkbox, {
                  checked: field.selected,
                  onCheckedChange: () => handleToggleBulkSelect(field.path),
                  disabled: bulkProcessing
                }),
                createElement(
                  Box,
                  null,
                  createElement(Typography, { variant: "pi", fontWeight: "bold" }, field.path),
                  field.preview && createElement(
                    Typography,
                    { variant: "pi", textColor: "neutral600" },
                    field.preview.isEmpty ? "Empty" : `${field.preview.itemCount} item${field.preview.itemCount !== 1 ? "s" : ""}`
                  ),
                  field.status === "success" && createElement(Typography, { variant: "pi", textColor: "success600" }, "Cleared!"),
                  field.status === "error" && createElement(Typography, { variant: "pi", textColor: "danger600" }, field.error)
                )
              ),
              createElement(
                Button,
                { variant: "ghost", size: "S", onClick: () => handleRemoveFromBulk(field.path), disabled: bulkProcessing },
                createElement(Cross, { fill: "neutral500", width: 16, height: 16 })
              )
            )
          )
        )
      ),
      bulkFields.length > 0 && createElement(
        Flex,
        { gap: 2, marginTop: 4 },
        createElement(
          Button,
          {
            variant: "secondary",
            onClick: handleBulkPreview,
            disabled: selectedCount === 0 || bulkProcessing,
            loading: bulkProcessing,
            style: { flex: 1 },
            startIcon: createElement(Eye)
          },
          "Preview All"
        ),
        createElement(
          Button,
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
  return createElement(
    Box,
    { padding: 4 },
    createElement(
      Flex,
      { justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
      createElement(Typography, { variant: "omega", fontWeight: "bold" }, "Enter field path to clear:"),
      createElement(Button, { variant: "tertiary", size: "S", onClick: () => setBulkMode(true) }, "Bulk Mode")
    ),
    createElement(TextInput, {
      placeholder: "e.g., field, field.nested, blocks[0].items.subfield",
      value: inputValue,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      disabled: loading,
      "aria-label": "Field path"
    }),
    // Favorites section
    favorites.length > 0 && !preview && !result && createElement(
      Box,
      { marginTop: 3, padding: 3, background: "neutral100", hasRadius: true },
      createElement(
        Flex,
        { justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
        createElement(
          Flex,
          { gap: 1, alignItems: "center" },
          createElement(Star, { fill: "warning500", width: 14, height: 14 }),
          createElement(Typography, { variant: "pi", fontWeight: "bold" }, "Favorites")
        )
      ),
      createElement(
        Flex,
        { gap: 2, wrap: "wrap" },
        ...favorites.map(
          (fav) => createElement(
            Flex,
            { key: fav, gap: 1, alignItems: "center" },
            createElement(
              Button,
              {
                variant: "tertiary",
                size: "S",
                onClick: () => setInputValue(fav),
                disabled: loading
              },
              fav
            ),
            createElement(
              Button,
              {
                variant: "ghost",
                size: "S",
                onClick: () => removeFromFavorites(fav),
                disabled: loading,
                style: { padding: "4px", minWidth: "auto" }
              },
              createElement(Cross, { fill: "neutral500", width: 12, height: 12 })
            )
          )
        )
      )
    ),
    // Add to favorites button (when input has value and not in favorites)
    !preview && inputValue.trim() && !isFavorite(inputValue.trim()) && createElement(
      Box,
      { marginTop: 2 },
      createElement(
        Button,
        {
          variant: "ghost",
          size: "S",
          onClick: () => addToFavorites(inputValue.trim()),
          disabled: loading || validatingFavorite,
          loading: validatingFavorite,
          startIcon: createElement(Star)
        },
        validatingFavorite ? "Validating..." : "Add to Favorites"
      )
    ),
    // Action buttons
    !preview && !result && inputValue.trim() && createElement(
      Flex,
      { gap: 2, marginTop: 4 },
      createElement(
        Button,
        { variant: "secondary", onClick: () => handlePreview(), disabled: loading, loading, style: { flex: 1 }, startIcon: createElement(Eye) },
        "Preview"
      ),
      createElement(Button, { variant: "danger", onClick: () => handleClear(), disabled: loading, style: { flex: 1 } }, "Clear Now")
    ),
    // Preview results
    preview && !result && createElement(
      Box,
      { marginTop: 4 },
      createElement(
        Box,
        { padding: 3, background: "neutral100", hasRadius: true, marginBottom: 3 },
        createElement(Typography, { variant: "omega", fontWeight: "bold" }, `Field: ${preview.fieldPath}`),
        createElement(Box, { marginTop: 1 }, createElement(Typography, { variant: "pi", textColor: "neutral600" }, `Type: ${preview.fieldType}`)),
        createElement(
          Box,
          { marginTop: 1 },
          createElement(Typography, { variant: "pi", textColor: preview.isEmpty ? "neutral600" : "danger600", fontWeight: "bold" }, preview.message)
        )
      ),
      !preview.isEmpty && preview.items.length > 0 && createElement(
        Box,
        { padding: 3, background: "danger100", hasRadius: true, marginBottom: 3, style: { maxHeight: "200px", overflowY: "auto" } },
        createElement(Typography, { variant: "pi", fontWeight: "bold", textColor: "danger700" }, "Items to be deleted:"),
        createElement(
          Box,
          { marginTop: 2 },
          ...preview.items.slice(0, 20).map(
            (item, idx) => createElement(
              Box,
              { key: idx, marginTop: 1 },
              createElement(
                Typography,
                { variant: "pi", textColor: "danger600" },
                item.componentHandle ? `• [${item.componentHandle}] ${item.label}` : `• ${item.label}`
              )
            )
          ),
          preview.items.length > 20 && createElement(
            Box,
            { marginTop: 1 },
            createElement(Typography, { variant: "pi", textColor: "danger600", fontStyle: "italic" }, `... and ${preview.items.length - 20} more items`)
          )
        )
      ),
      !preview.isEmpty && createElement(
        Box,
        { padding: 3, background: "danger100", hasRadius: true, marginBottom: 3 },
        createElement(
          Flex,
          { gap: 2, alignItems: "center" },
          createElement(WarningCircle, { fill: "danger600" }),
          createElement(Typography, { variant: "pi", textColor: "danger600", fontWeight: "bold" }, "This action cannot be undone!")
        )
      ),
      createElement(
        Flex,
        { gap: 2 },
        createElement(Button, { variant: "tertiary", onClick: () => setPreview(null), disabled: loading, style: { flex: 1 } }, "Cancel"),
        !preview.isEmpty && createElement(
          Button,
          { variant: "danger", onClick: () => handleClear(), disabled: loading, loading, style: { flex: 1 } },
          "Confirm Delete"
        )
      )
    ),
    // Result message
    result && createElement(
      Box,
      { marginTop: 3, padding: 3, background: result.type === "success" ? "success100" : "danger100", hasRadius: true },
      createElement(
        Flex,
        { gap: 2, alignItems: "center" },
        result.type === "success" ? createElement(Check, { fill: "success600" }) : createElement(Cross, { fill: "danger600" }),
        createElement(Typography, { textColor: result.type === "success" ? "success700" : "danger700" }, result.message)
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
        icon: createElement(Trash),
        variant: "danger",
        position: "panel",
        dialog: {
          type: "modal",
          title: "Clear Field Data",
          content: createElement(ClearFieldModalContent, { contentType: model, documentId: documentId || "" })
        }
      };
    };
    contentManagerApis.addDocumentAction([ClearFieldAction]);
  },
  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/en.json": () => import("../_chunks/en-BtKZmRuE.mjs") }), `./translations/${locale}.json`, 3);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  }
};
export {
  index as default
};
