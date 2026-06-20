/* global tinymce */
/**
 * Second-row toolbar toggle (more-drawer) — expanded by default.
 */
(function registerNotemdToolbarPlugin() {
  if (typeof tinymce === 'undefined') return;

  const HIDDEN_CLASS = 'notemd-toolbar-extra-hidden';
  const EXTRA_CLASS = 'notemd-toolbar-extra';

  function markExtraToolbar(editor) {
    const header = editor.getContainer()?.querySelector('.tox-editor-header');
    if (!header) return;

    header.querySelectorAll(`.${EXTRA_CLASS}`).forEach((el) => el.classList.remove(EXTRA_CLASS));

    const toolbars = header.querySelectorAll('.tox-toolbar-overlord > .tox-toolbar');
    if (toolbars.length >= 2) {
      toolbars[1].classList.add(EXTRA_CLASS);
    }
  }

  function isExtraVisible(editor) {
    return !editor.getContainer()?.classList.contains(HIDDEN_CLASS);
  }

  function setExtraVisible(editor, visible) {
    editor.getContainer()?.classList.toggle(HIDDEN_CLASS, !visible);
  }

  tinymce.PluginManager.add('notemdtoolbar', function (editor) {
    editor.ui.registry.addToggleButton('notemdtoolbarexpand', {
      icon: 'more-drawer',
      tooltip: 'Show or hide additional tools',
      onAction: (api) => {
        const visible = !api.isActive();
        setExtraVisible(editor, visible);
        api.setActive(visible);
      },
      onSetup: (api) => {
        const sync = () => {
          markExtraToolbar(editor);
          const visible = isExtraVisible(editor);
          api.setActive(visible);
        };

        sync();
        editor.on('init', sync);
        editor.on('ResizeEditor', sync);
        return () => {
          editor.off('init', sync);
          editor.off('ResizeEditor', sync);
        };
      }
    });

    editor.on('init', () => {
      setExtraVisible(editor, true);
      markExtraToolbar(editor);
    });
  });
})();
