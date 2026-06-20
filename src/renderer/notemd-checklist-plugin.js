/* global tinymce */
/**
 * Custom checklist plugin — span-based checkboxes (TinyMCE premium checklist is not in OSS).
 */
(function registerNotemdChecklistPlugin() {
  if (typeof tinymce === 'undefined') return;

  const LIST_CLASS = 'notemd-checklist';
  // TinyMCE treats UL/OL with a tox-* class as custom lists (bullist/numlist stay off).
  const TINYMCE_LIST_CLASS = 'tox-notemd-checklist';
  const CHECKED_CLASS = 'notemd-checked';
  const BOX_CLASS = 'notemd-check-box';
  const TEXT_CLASS = 'notemd-checklist-text';

  function emitChange(editor) {
    if (typeof editor.dispatch === 'function') {
      editor.dispatch('change');
    }
  }

  function sortByDomOrder(nodes) {
    return [...nodes].sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }

  function isChecklistList(node) {
    return node && node.nodeName === 'UL' && node.classList.contains(LIST_CLASS);
  }

  function getChecklistUl(editor, node) {
    return editor.dom.getParent(node, `ul.${LIST_CLASS}`);
  }

  function isInChecklist(editor) {
    return !!getChecklistUl(editor, editor.selection.getNode());
  }

  function syncChecklistToolbar(editor, api) {
    const active = isInChecklist(editor);
    if (api) api.setActive(active);
    return active;
  }

  function refreshToolbarState(editor, api, forcedActive) {
    editor.selection.normalize();
    if (api && forcedActive !== undefined) {
      api.setActive(forcedActive);
    } else {
      syncChecklistToolbar(editor, api);
    }
    editor.nodeChanged();
    if (api) {
      globalThis.setTimeout(() => {
        if (forcedActive !== undefined) {
          api.setActive(forcedActive);
        } else {
          syncChecklistToolbar(editor, api);
        }
        editor.nodeChanged();
      }, 0);
    }
  }

  function tagChecklistUl(editor, ul) {
    editor.dom.addClass(ul, LIST_CLASS);
    editor.dom.addClass(ul, TINYMCE_LIST_CLASS);
  }

  function ensureAllChecklistUlsTagged(editor) {
    editor.getBody().querySelectorAll(`ul.${LIST_CLASS}`).forEach((ul) => {
      if (!ul.classList.contains(TINYMCE_LIST_CLASS)) {
        editor.dom.addClass(ul, TINYMCE_LIST_CLASS);
      }
    });
  }

  function pruneEmptyChecklistUls(editor) {
    editor.getBody().querySelectorAll(`ul.${LIST_CLASS}`).forEach((ul) => {
      const hasLi = [...ul.children].some((n) => n.nodeName === 'LI');
      if (!hasLi) editor.dom.remove(ul);
    });
  }

  function getLiText(li) {
    const textSpan = li.querySelector(`:scope > span.${TEXT_CLASS}`);
    if (textSpan) return textSpan.innerHTML;
    const clone = li.cloneNode(true);
    clone.querySelector(`.${BOX_CLASS}`)?.remove();
    clone.querySelector('input[type="checkbox"]')?.remove();
    return clone.innerHTML;
  }

  function ensureTextSpan(editor, li) {
    let textSpan = li.querySelector(`:scope > span.${TEXT_CLASS}`);
    if (textSpan) return textSpan;

    textSpan = editor.dom.create('span', { class: TEXT_CLASS });
    const toMove = [...li.childNodes].filter(
      (n) => !(n.nodeType === 1 && (n.classList?.contains(BOX_CLASS) || n.nodeName === 'INPUT'))
    );
    toMove.forEach((n) => textSpan.appendChild(n));
    li.appendChild(textSpan);
    return textSpan;
  }

  function cleanTextSpan(textSpan) {
    if (!textSpan) return;
    while (textSpan.firstChild) {
      const n = textSpan.firstChild;
      if (n.nodeType === 3 && !n.textContent.replace(/\u00a0/g, ' ').trim()) {
        n.remove();
        continue;
      }
      break;
    }
    if (!textSpan.childNodes.length) textSpan.innerHTML = '<br data-mce-bogus="1">';
  }

  function createCheckBox(editor) {
    return editor.dom.create('span', {
      class: BOX_CLASS,
      contenteditable: 'false',
      'data-mce-contenteditable': 'false',
      role: 'checkbox',
      'aria-checked': 'false'
    });
  }

  function setLiChecked(_editor, li, checked) {
    const box = li.querySelector(`:scope > .${BOX_CLASS}`);
    if (checked) {
      li.classList.add(CHECKED_CLASS);
      if (box) box.setAttribute('aria-checked', 'true');
    } else {
      li.classList.remove(CHECKED_CLASS);
      if (box) box.setAttribute('aria-checked', 'false');
    }
  }

  function ensureChecklistItem(editor, li, checked) {
    li.classList.remove('tox-checklist--checked');
    li.removeAttribute('aria-checked');
    li.querySelector('input[type="checkbox"]')?.remove();

    let box = li.querySelector(`:scope > .${BOX_CLASS}`);
    if (!box) {
      box = createCheckBox(editor);
      li.insertBefore(box, li.firstChild);
    }

    const textSpan = ensureTextSpan(editor, li);
    cleanTextSpan(textSpan);
    setLiChecked(editor, li, checked);
    return textSpan;
  }

  function styleChecklistUl(editor, ul) {
    tagChecklistUl(editor, ul);
    ul.removeAttribute('data-mce-type');
    editor.dom.setStyles(ul, {
      'list-style-type': 'none',
      'list-style': 'none',
      'padding-left': '0',
      margin: '0 0 0.5em 0'
    });
  }

  function isConvertibleBlock(editor, block) {
    if (!block) return false;
    if (block.nodeName === 'LI') return true;
    if (editor.dom.getParent(block, 'ul,ol')) return false;
    return editor.dom.isBlock(block);
  }

  function collectContentsFromBlocks(editor, blocks) {
    const contents = [];
    const ulsToCleanup = new Set();

    sortByDomOrder(blocks).forEach((block) => {
      if (!isConvertibleBlock(editor, block)) return;

      if (block.nodeName === 'LI') {
        const parentUl = block.parentNode;
        contents.push({
          html: getLiText(block).trim() || '<br data-mce-bogus="1">',
          checked:
            block.classList.contains(CHECKED_CLASS) ||
            block.classList.contains('tox-checklist--checked'),
          remove: block
        });
        if (parentUl) ulsToCleanup.add(parentUl);
        return;
      }

      contents.push({
        html: block.innerHTML.trim() || '<br data-mce-bogus="1">',
        checked: false,
        remove: block
      });
    });

    return { contents, ulsToCleanup };
  }

  function convertMultipleBlocksToChecklist(editor, blocks) {
    const { contents, ulsToCleanup } = collectContentsFromBlocks(editor, blocks);
    if (!contents.length) return false;

    const ul = editor.dom.create('ul');
    styleChecklistUl(editor, ul);

    contents.forEach(({ html, checked }) => {
      const li = editor.dom.create('li');
      const textSpan = ensureChecklistItem(editor, li, checked);
      textSpan.innerHTML = html;
      ul.appendChild(li);
    });

    const anchor = contents[0].remove;
    anchor.parentNode.insertBefore(ul, anchor);
    contents.forEach(({ remove }) => editor.dom.remove(remove));

    ulsToCleanup.forEach((listEl) => {
      const remaining = [...listEl.children].filter((n) => n.nodeName === 'LI');
      if (!remaining.length) editor.dom.remove(listEl);
    });

    const firstText = ul.querySelector(`.${TEXT_CLASS}`);
    if (firstText) editor.selection.setCursorLocation(firstText, 0);
    refreshToolbarState(editor);
    return true;
  }

  function removeMultipleChecklistItems(editor, blocks) {
    const lis = sortByDomOrder(
      blocks.filter((b) => b.nodeName === 'LI' && isChecklistList(b.parentNode))
    );
    if (!lis.length) return false;

    const ulsAffected = new Set();
    const paras = [];

    lis.forEach((li) => {
      const html = getLiText(li).trim() || '<br data-mce-bogus="1">';
      const p = editor.dom.create('p');
      p.innerHTML = html;
      li.parentNode.insertBefore(p, li);
      paras.push(p);
      ulsAffected.add(li.parentNode);
      editor.dom.remove(li);
    });

    ulsAffected.forEach((ul) => {
      if (!ul.children.length) editor.dom.remove(ul);
    });

    pruneEmptyChecklistUls(editor);

    const focus = paras[paras.length - 1];
    if (focus) {
      editor.selection.setCursorLocation(focus, focus.childNodes.length);
    }

    return true;
  }

  function convertUlToChecklist(editor, ul) {
    styleChecklistUl(editor, ul);
    [...ul.children]
      .filter((n) => n.nodeName === 'LI')
      .forEach((li) => {
        const existing = li.querySelector('input[type="checkbox"]');
        const checked =
          existing?.checked ||
          existing?.hasAttribute('checked') ||
          li.classList.contains(CHECKED_CLASS) ||
          li.classList.contains('tox-checklist--checked');
        ensureChecklistItem(editor, li, checked);
      });
  }

  function removeChecklistToParagraphs(editor, ul) {
    const paras = [];
    [...ul.children]
      .filter((n) => n.nodeName === 'LI')
      .forEach((li) => {
        const html = getLiText(li).trim() || '<br data-mce-bogus="1">';
        const p = editor.dom.create('p');
        p.innerHTML = html;
        paras.push(p);
      });

    if (!paras.length) {
      const p = editor.dom.create('p');
      p.innerHTML = '<br data-mce-bogus="1">';
      editor.dom.replace(p, ul);
      editor.selection.setCursorLocation(p, 0);
      refreshToolbarState(editor);
      return;
    }

    const parent = ul.parentNode;
    paras.forEach((p, i) => {
      parent.insertBefore(p, i === 0 ? ul : paras[i - 1].nextSibling);
    });
    editor.dom.remove(ul);
    pruneEmptyChecklistUls(editor);
    editor.selection.setCursorLocation(paras[paras.length - 1], 0);
    refreshToolbarState(editor);
  }

  function convertBlockToChecklist(editor, block) {
    const content = block.innerHTML.trim() || '<br data-mce-bogus="1">';
    const ul = editor.dom.create('ul');
    styleChecklistUl(editor, ul);
    const li = editor.dom.create('li');
    const textSpan = ensureChecklistItem(editor, li, false);
    textSpan.innerHTML = content;
    ul.appendChild(li);
    editor.dom.replace(ul, block);
    editor.selection.setCursorLocation(textSpan, textSpan.childNodes.length);
  }

  function insertNewChecklist(editor) {
    const html =
      `<ul class="${LIST_CLASS} ${TINYMCE_LIST_CLASS}" style="list-style:none;padding-left:0;margin:0 0 0.5em 0">` +
      `<li><span class="${BOX_CLASS}" contenteditable="false" data-mce-contenteditable="false" role="checkbox" aria-checked="false"></span>` +
      `<span class="${TEXT_CLASS}"><br data-mce-bogus="1"></span></li></ul>`;

    editor.insertContent(html);
    const inserted = editor.getBody().querySelector(`ul.${LIST_CLASS}:last-of-type`);
    const target = inserted?.querySelector(`.${TEXT_CLASS}`);
    if (target) editor.selection.setCursorLocation(target, 0);
  }

  function convertOlToChecklist(editor, ol) {
    const ul = editor.dom.create('ul');
    styleChecklistUl(editor, ul);
    [...ol.children]
      .filter((n) => n.nodeName === 'LI')
      .forEach((srcLi) => {
        const li = editor.dom.create('li');
        const textSpan = ensureChecklistItem(editor, li, false);
        textSpan.innerHTML = getLiText(srcLi).trim() || '<br data-mce-bogus="1">';
        ul.appendChild(li);
      });
    editor.dom.replace(ul, ol);
    const firstText = ul.querySelector(`.${TEXT_CLASS}`);
    if (firstText) editor.selection.setCursorLocation(firstText, 0);
  }

  function isTextSpanEmpty(textSpan) {
    if (!textSpan) return true;
    const html = textSpan.innerHTML.replace(/<br[^>]*data-mce-bogus="1"[^>]*>/gi, '').trim();
    if (!html) return true;
    return !textSpan.textContent.replace(/\u00a0/g, ' ').trim();
  }

  function isCursorAtStartOfTextSpan(editor, textSpan) {
    if (!textSpan) return false;
    const rng = editor.selection.getRng();
    if (!rng.collapsed) return false;
    const probe = editor.dom.createRng();
    probe.setStart(textSpan, 0);
    probe.setEnd(rng.startContainer, rng.startOffset);
    return probe.toString().length === 0;
  }

  function handleChecklistBackspace(editor, e) {
    const li = editor.dom.getParent(editor.selection.getNode(), 'li');
    const ul = li && editor.dom.getParent(li, `ul.${LIST_CLASS}`);
    if (!ul || !li) return;

    const textSpan = li.querySelector(`.${TEXT_CLASS}`);
    const empty = isTextSpanEmpty(textSpan);

    if (empty) {
      e.preventDefault();
      const prevLi = li.previousElementSibling;
      const nextLi = li.nextElementSibling;
      editor.dom.remove(li);

      if (prevLi) {
        const prevText = prevLi.querySelector(`.${TEXT_CLASS}`);
        editor.selection.setCursorLocation(prevText, prevText.childNodes.length);
      } else if (nextLi) {
        const nextText = nextLi.querySelector(`.${TEXT_CLASS}`);
        editor.selection.setCursorLocation(nextText, 0);
      } else {
        const newLi = editor.dom.create('li');
        const ts = ensureChecklistItem(editor, newLi, false);
        ul.appendChild(newLi);
        editor.selection.setCursorLocation(ts, 0);
      }
      emitChange(editor);
      editor.nodeChanged();
      return;
    }

    if (isCursorAtStartOfTextSpan(editor, textSpan)) {
      e.preventDefault();
      const prevLi = li.previousElementSibling;
      if (!prevLi) return;

      const prevText = prevLi.querySelector(`.${TEXT_CLASS}`);
      const curHtml = textSpan.innerHTML;
      if (curHtml.trim()) {
        prevText.innerHTML += curHtml;
      }
      editor.dom.remove(li);
      editor.selection.setCursorLocation(prevText, prevText.childNodes.length);
      emitChange(editor);
      editor.nodeChanged();
    }
  }

  function getChecklistUlFromBlocks(blocks) {
    const checklistLis = blocks.filter((b) => b.nodeName === 'LI' && isChecklistList(b.parentNode));
    if (!checklistLis.length) return null;

    const parentUls = new Set(checklistLis.map((li) => li.parentNode));
    if (parentUls.size !== 1) return null;

    const ul = [...parentUls][0];
    const ulLis = [...ul.children].filter((n) => n.nodeName === 'LI');
    const allItemsSelected =
      checklistLis.length === ulLis.length &&
      ulLis.every((li) => checklistLis.includes(li));

    return allItemsSelected ? ul : null;
  }

  function handleMultiSelection(editor) {
    const blocks = sortByDomOrder(editor.selection.getSelectedBlocks());
    if (blocks.length <= 1) return false;

    const fullChecklistUl = getChecklistUlFromBlocks(blocks);
    if (fullChecklistUl) {
      removeChecklistToParagraphs(editor, fullChecklistUl);
      return true;
    }

    const checklistLis = blocks.filter((b) => b.nodeName === 'LI' && isChecklistList(b.parentNode));
    const allSelectedAreChecklistItems =
      checklistLis.length > 0 && checklistLis.length === blocks.length;

    if (allSelectedAreChecklistItems) {
      removeMultipleChecklistItems(editor, blocks);
      return true;
    }

    return convertMultipleBlocksToChecklist(editor, blocks);
  }

  function handleSingleSelection(editor) {
    const node = editor.selection.getNode();
    const checklistUl = getChecklistUl(editor, node);

    if (checklistUl) {
      removeChecklistToParagraphs(editor, checklistUl);
      return true;
    }

    const ol = editor.dom.getParent(node, 'ol');
    if (ol) {
      convertOlToChecklist(editor, ol);
      return true;
    }

    const regularUl = editor.dom.getParent(node, 'ul');
    if (regularUl) {
      convertUlToChecklist(editor, regularUl);
      return true;
    }

    const block = editor.dom.getParent(node, 'p,h1,h2,h3,h4,h5,h6,div,blockquote,pre,td,th');
    if (block && !editor.dom.getParent(block, 'ul,ol')) {
      convertBlockToChecklist(editor, block);
      return true;
    }

    insertNewChecklist(editor);
    return true;
  }

  tinymce.PluginManager.add('notemdchecklist', function (editor) {
    let checklistToolbarApi = null;

    editor.ui.registry.addToggleButton('notemdchecklist', {
      icon: 'checklist',
      tooltip: 'Checklist',
      onAction: () => {
        const turningOff = isInChecklist(editor);
        const handled = handleMultiSelection(editor) || handleSingleSelection(editor);
        if (!handled) return;

        emitChange(editor);
        pruneEmptyChecklistUls(editor);
        const nextActive = !turningOff;
        checklistToolbarApi?.setActive(nextActive);
        refreshToolbarState(editor, checklistToolbarApi, nextActive);
      },
      onSetup: (api) => {
        checklistToolbarApi = api;
        const update = () => syncChecklistToolbar(editor, api);
        update();
        editor.on('NodeChange', update);
        editor.on('SelectionChange', update);
        return () => {
          editor.off('NodeChange', update);
          editor.off('SelectionChange', update);
          if (checklistToolbarApi === api) checklistToolbarApi = null;
        };
      }
    });

    editor.on('init', () => {
      ensureAllChecklistUlsTagged(editor);

      const body = editor.getBody();
      body.addEventListener(
        'mousedown',
        (e) => {
          const box = e.target.closest?.(`.${BOX_CLASS}`);
          if (!box || !editor.dom.getParent(box, `ul.${LIST_CLASS}`)) return;

          e.preventDefault();
          e.stopPropagation();

          const li = box.closest('li');
          if (!li) return;

          const next = !li.classList.contains(CHECKED_CLASS);
          setLiChecked(editor, li, next);
          emitChange(editor);
          editor.nodeChanged();
        },
        true
      );
    });

    editor.on('SetContent', () => {
      ensureAllChecklistUlsTagged(editor);
      refreshToolbarState(editor, checklistToolbarApi);
    });

    editor.on('BeforeExecCommand', (e) => {
      if (!isInChecklist(editor)) return;

      const blocked = [
        'Indent',
        'Outdent',
        'InsertUnorderedList',
        'InsertOrderedList',
        'RemoveList',
        'mceListUpdate'
      ];
      if (blocked.includes(e.command)) {
        e.preventDefault();
      }
    });

    editor.on('keydown', (e) => {
      const li = editor.dom.getParent(editor.selection.getNode(), 'li');
      const ul = li && editor.dom.getParent(li, `ul.${LIST_CLASS}`);

      if (ul && li && e.key === 'Backspace') {
        handleChecklistBackspace(editor, e);
        return;
      }

      if (!ul || !li || e.key !== 'Enter') return;

      e.preventDefault();
      const newLi = editor.dom.create('li');
      const textSpan = ensureChecklistItem(editor, newLi, false);
      editor.dom.insertAfter(newLi, li);
      editor.selection.setCursorLocation(textSpan, 0);
      emitChange(editor);
      editor.nodeChanged();
    });
  });
})();
