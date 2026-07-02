/* global tinymce */
/**
 * Font family dropdown — Default stack first, with active selection highlight.
 */
(function registerNotemdFontFamilyPlugin() {
  if (typeof tinymce === 'undefined') return;

  const DEFAULT_FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const FONT_ITEMS = [
    { text: 'Default', value: DEFAULT_FONT_STACK },
    { text: 'Andale Mono', value: 'andale mono, times, monospace' },
    { text: 'Arial', value: 'arial, helvetica, sans-serif' },
    { text: 'Arial Black', value: 'arial black, sans-serif' },
    { text: 'Book Antiqua', value: 'book antiqua, palatino, serif' },
    { text: 'Comic Sans MS', value: 'comic sans ms, sans-serif' },
    { text: 'Courier New', value: 'courier new, courier, monospace' },
    { text: 'Georgia', value: 'georgia, palatino, serif' },
    { text: 'Helvetica', value: 'helvetica, arial, sans-serif' },
    { text: 'Impact', value: 'impact, sans-serif' },
    { text: 'Tahoma', value: 'tahoma, arial, helvetica, sans-serif' },
    { text: 'Times New Roman', value: 'times new roman, times, serif' },
    { text: 'Trebuchet MS', value: 'trebuchet ms, geneva, sans-serif' },
    { text: 'Verdana', value: 'verdana, geneva, sans-serif' }
  ];

  const DEFAULT_FONT_PARTS = splitFonts(DEFAULT_FONT_STACK);
  const SYSTEM_FONT_ALIASES = new Set(['-apple-system', 'blinkmacsystemfont', 'system-ui', 'segoe ui']);

  function splitFonts(fontFamily) {
    return String(fontFamily || '')
      .split(/\s*,\s*/)
      .map((f) => f.replace(/^['"]+|['"]+$/g, '').trim().toLowerCase())
      .filter(Boolean);
  }

  function isDefaultFontStack(fontFamily) {
    const parts = splitFonts(fontFamily);
    if (!parts.length) return true;
    if (parts.length === 1 && parts[0] === 'sans-serif') return true;
    if (SYSTEM_FONT_ALIASES.has(parts[0])) {
      return DEFAULT_FONT_PARTS.every((font, idx) => !parts[idx] || parts[idx] === font);
    }
    return false;
  }

  function fontsMatch(a, b) {
    const left = splitFonts(a);
    const right = splitFonts(b);
    if (!left.length || !right.length) return false;
    if (left.join(',') === right.join(',')) return true;
    return left[0] === right[0];
  }

  function getActiveFontItem(editor) {
    const raw = editor.queryCommandValue('FontName') || '';
    if (isDefaultFontStack(raw)) return FONT_ITEMS[0];
    const match = FONT_ITEMS.find((item) => fontsMatch(item.value, raw));
    return match || FONT_ITEMS[0];
  }

  function applyFont(editor, item) {
    editor.undoManager.transact(() => {
      editor.focus();
      editor.execCommand('FontName', false, item.value);
    });
    if (typeof editor.dispatch === 'function') {
      editor.dispatch('change');
    }
  }

  tinymce.PluginManager.add('notemdfontfamily', function (editor) {
    editor.ui.registry.addMenuButton('notemdfontfamily', {
      text: 'Default',
      fetch: (callback) => {
        callback(
          FONT_ITEMS.map((item) => ({
            type: 'togglemenuitem',
            text: item.text,
            onAction: () => applyFont(editor, item),
            onSetup: (api) => {
              const sync = () => {
                api.setActive(getActiveFontItem(editor) === item);
              };
              sync();
              editor.on('NodeChange', sync);
              return () => {
                editor.off('NodeChange', sync);
              };
            }
          }))
        );
      },
      onSetup: (api) => {
        const sync = () => {
          api.setText(getActiveFontItem(editor).text);
        };
        sync();
        editor.on('NodeChange', sync);
        editor.on('SwitchMode', sync);
        return () => {
          editor.off('NodeChange', sync);
          editor.off('SwitchMode', sync);
        };
      }
    });
  });
})();
