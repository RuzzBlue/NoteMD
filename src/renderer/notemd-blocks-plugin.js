/* global tinymce */
/**
 * Custom blocks dropdown — ordered headings first, paragraph below titles, code exit fixes.
 */
(function registerNotemdBlocksPlugin() {
  if (typeof tinymce === 'undefined') return;

  const CODE_BLOCK_CLASS = 'notemd-code-block';
  const BLOCK_ITEMS = [
    { text: 'Heading 1', tag: 'h1' },
    { text: 'Heading 2', tag: 'h2' },
    { text: 'Heading 3', tag: 'h3' },
    { text: 'Heading 4', tag: 'h4' },
    { text: 'Heading 5', tag: 'h5' },
    { text: 'Heading 6', tag: 'h6' },
    { text: 'Paragraph', tag: 'p' },
    { text: 'Preformatted', tag: 'pre', plainPre: true },
    { text: 'Code', tag: 'pre', codeBlock: true },
    { text: 'Blockquote', tag: 'blockquote' },
    { text: 'Div', tag: 'div' }
  ];

  function emitChange(editor) {
    if (typeof editor.dispatch === 'function') {
      editor.dispatch('change');
    }
  }

  function unwrapElement(editor, el) {
    if (!el || !el.parentNode) return;
    while (el.firstChild) {
      el.parentNode.insertBefore(el.firstChild, el);
    }
    editor.dom.remove(el);
  }

  function clearInlineCodeAtSelection(editor) {
    editor.formatter.remove('code');
    const node = editor.selection.getNode();
    const codeEl = editor.dom.getParent(node, 'code');
    if (codeEl && !editor.dom.getParent(codeEl, 'pre')) {
      unwrapElement(editor, codeEl);
    }
  }

  function unwrapPreBlock(editor, pre) {
    if (!pre || pre.nodeName !== 'PRE') return null;
    const p = editor.dom.create('p');
    const text = pre.textContent || '';
    if (text) {
      p.appendChild(editor.getDoc().createTextNode(text));
    } else {
      p.innerHTML = '<br data-mce-bogus="1">';
    }
    editor.dom.replace(p, pre, true);
    return p;
  }

  function exitCodeContexts(editor) {
    clearInlineCodeAtSelection(editor);
    const node = editor.selection.getNode();
    const pre = editor.dom.getParent(node, 'pre');
    if (pre) {
      const replacement = unwrapPreBlock(editor, pre);
      if (replacement) {
        editor.selection.setCursorLocation(replacement, 0);
      }
    }
  }

  function ensurePlainPre(editor, pre) {
    editor.dom.removeClass(pre, CODE_BLOCK_CLASS);
    const innerCode = pre.querySelector('code');
    if (innerCode) {
      pre.textContent = innerCode.textContent || '';
    }
  }

  function ensureCodePre(editor, pre) {
    editor.dom.addClass(pre, CODE_BLOCK_CLASS);
    let codeEl = pre.querySelector('code');
    if (!codeEl) {
      codeEl = editor.dom.create('code');
      codeEl.textContent = pre.textContent || '';
      pre.textContent = '';
      pre.appendChild(codeEl);
    }
    editor.selection.setCursorLocation(codeEl, codeEl.childNodes.length);
  }

  function applyBlockFormat(editor, item) {
    editor.undoManager.transact(() => {
      const node = editor.selection.getNode();
      const inPre = editor.dom.getParent(node, 'pre');

      if (item.tag === 'p' || item.tag === 'blockquote' || item.tag === 'div' || /^h[1-6]$/.test(item.tag)) {
        exitCodeContexts(editor);
        editor.execCommand('FormatBlock', false, item.tag);
        editor.formatter.remove('code');
      } else if (item.codeBlock) {
        clearInlineCodeAtSelection(editor);
        if (inPre) {
          ensureCodePre(editor, inPre);
        } else {
          editor.execCommand('FormatBlock', false, 'pre');
          const pre = editor.dom.getParent(editor.selection.getNode(), 'pre');
          if (pre) ensureCodePre(editor, pre);
        }
      } else if (item.plainPre) {
        clearInlineCodeAtSelection(editor);
        editor.execCommand('FormatBlock', false, 'pre');
        const pre = editor.dom.getParent(editor.selection.getNode(), 'pre');
        if (pre) ensurePlainPre(editor, pre);
      } else {
        editor.execCommand('FormatBlock', false, item.tag);
      }
    });
    emitChange(editor);
  }

  function getActiveBlockLabel(editor) {
    const node = editor.selection.getNode();
    const block = editor.dom.getParent(node, 'h1,h2,h3,h4,h5,h6,p,pre,blockquote,div') || node;
    const tag = (block?.nodeName || 'P').toLowerCase();

    if (tag === 'pre') {
      return editor.dom.hasClass(block, CODE_BLOCK_CLASS) ? 'Code' : 'Preformatted';
    }

    const match = BLOCK_ITEMS.find((item) => item.tag === tag && !item.codeBlock && !item.plainPre);
    return match?.text || 'Paragraph';
  }

  function selectionIsEndOfPre(editor, pre) {
    if (!pre) return false;
    const rng = editor.selection.getRng();
    if (!rng.collapsed) return false;
    const endRange = editor.dom.createRng();
    endRange.selectNodeContents(pre);
    endRange.collapse(false);
    return rng.compareBoundaryPoints(Range.END_TO_END, endRange) >= 0;
  }

  function bindCodeExitKeys(editor) {
    editor.on('keydown', (e) => {
      if (e.key !== 'Enter') return;

      const node = editor.selection.getNode();
      const inlineCode = editor.dom.getParent(node, 'code');
      const pre = editor.dom.getParent(node, 'pre');

      if (inlineCode && !pre) {
        e.preventDefault();
        editor.undoManager.transact(() => {
          editor.formatter.remove('code');
          unwrapElement(editor, inlineCode);
          editor.execCommand('InsertParagraph');
        });
        emitChange(editor);
        return;
      }

      if (pre && selectionIsEndOfPre(editor, pre) && !e.shiftKey) {
        e.preventDefault();
        editor.undoManager.transact(() => {
          const p = editor.dom.create('p');
          p.innerHTML = '<br data-mce-bogus="1">';
          editor.dom.insertAfter(p, pre);
          editor.selection.setCursorLocation(p, 0);
          editor.formatter.remove('code');
        });
        emitChange(editor);
      }
    });

    editor.on('ExecCommand', (e) => {
      if (e.command !== 'FormatBlock') return;
      const fmt = String(e.value || '').toLowerCase();
      if (fmt === 'p' || fmt === 'blockquote' || fmt === 'div' || /^h[1-6]$/.test(fmt)) {
        window.setTimeout(() => {
          editor.formatter.remove('code');
        }, 0);
      }
    });
  }

  tinymce.PluginManager.add('notemdblocks', function (editor) {
    editor.ui.registry.addMenuButton('notemdblocks', {
      text: 'Blocks',
      fetch: (callback) => {
        callback(
          BLOCK_ITEMS.map((item) => ({
            type: 'menuitem',
            text: item.text,
            onAction: () => applyBlockFormat(editor, item)
          }))
        );
      },
      onSetup: (api) => {
        const sync = () => {
          api.setText(getActiveBlockLabel(editor));
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

    editor.on('init', () => {
      bindCodeExitKeys(editor);
    });
  });
})();
