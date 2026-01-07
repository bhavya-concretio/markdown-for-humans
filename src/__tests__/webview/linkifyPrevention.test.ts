/** @jest-environment jsdom */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Link from '@tiptap/extension-link';
import { ListKit } from '@tiptap/extension-list';
import { MarkdownParagraph } from '../../webview/extensions/markdownParagraph';
import { OrderedListMarkdownFix } from '../../webview/extensions/orderedListMarkdownFix';
import { ConfigureMarkedForFilenameBlocking } from '../../webview/extensions/configureMarkedForFilenameBlocking';

function createTestEditor(): Editor {
  const element = document.createElement('div');
  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        paragraph: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        link: false, // Disable Link in StarterKit to avoid duplicate with explicit Link extension
        undoRedo: {
          depth: 100,
        },
      }),
      MarkdownParagraph,
      Markdown.configure({
        // @ts-expect-error - linkify option exists in TipTap Markdown but may not be in type definitions
        linkify: false, // Critical: prevents auto-linking of .md extensions
        markedOptions: {
          gfm: true,
          breaks: true,
        },
      }),
      ListKit.configure({
        orderedList: false,
        taskItem: {
          nested: true,
        },
      }),
      OrderedListMarkdownFix,
      ConfigureMarkedForFilenameBlocking,
      Link.configure({
        openOnClick: false,
        autolink: false, // Disabled to prevent auto-linking
        protocols: [], // Disable protocol detection
      }),
    ],
    editorProps: {
      attributes: {
        class: 'markdown-editor',
        spellcheck: 'true',
      },
    },
  });
}

function hasLinkInJSON(json: any): boolean {
  const walk = (node: any): boolean => {
    if (node.type === 'link') {
      return true;
    }
    if (Array.isArray(node.content)) {
      return node.content.some((child: any) => walk(child));
    }
    if (Array.isArray(node.marks)) {
      return node.marks.some((mark: any) => mark.type === 'link');
    }
    return false;
  };

  return walk(json);
}

describe('Linkify prevention', () => {
  it('does not auto-link markdown filenames', () => {
    const editor = createTestEditor();

    try {
      editor.commands.setContent('ss.md', { contentType: 'markdown' });

      const json = editor.getJSON();
      expect(JSON.stringify(json)).not.toContain('"type":"link"');
      expect(hasLinkInJSON(json)).toBe(false);

      // Verify the text is preserved as plain text
      expect(editor.getText()).toBe('ss.md');
    } finally {
      editor.destroy();
    }
  });

  it('does not auto-link other .md patterns', () => {
    const editor = createTestEditor();

    try {
      editor.commands.setContent('gg.md', { contentType: 'markdown' });

      const json = editor.getJSON();
      expect(hasLinkInJSON(json)).toBe(false);
      expect(editor.getText()).toBe('gg.md');
    } finally {
      editor.destroy();
    }
  });

  it('does not auto-link file.txt patterns', () => {
    const editor = createTestEditor();

    try {
      editor.commands.setContent('file.txt', { contentType: 'markdown' });

      const json = editor.getJSON();
      expect(hasLinkInJSON(json)).toBe(false);
      expect(editor.getText()).toBe('file.txt');
    } finally {
      editor.destroy();
    }
  });

  it('keeps explicit markdown links working', () => {
    const editor = createTestEditor();

    try {
      editor.commands.setContent('[Readme](README.md)', { contentType: 'markdown' });

      const json = editor.getJSON();
      expect(hasLinkInJSON(json)).toBe(true);
      expect(JSON.stringify(json)).toContain('"type":"link"');

      // Verify link content is correct
      expect(editor.getHTML()).toContain('<a');
      expect(editor.getHTML()).toContain('README.md');
    } finally {
      editor.destroy();
    }
  });

  it('keeps explicit markdown links with URLs working', () => {
    const editor = createTestEditor();

    try {
      editor.commands.setContent('[Example](https://example.com)', { contentType: 'markdown' });

      const json = editor.getJSON();
      expect(hasLinkInJSON(json)).toBe(true);
      expect(editor.getHTML()).toContain('https://example.com');
    } finally {
      editor.destroy();
    }
  });

  it('preserves .md text in paragraphs with other content', () => {
    const editor = createTestEditor();

    try {
      editor.commands.setContent('Check out the file ss.md for details', {
        contentType: 'markdown',
      });

      const json = editor.getJSON();
      expect(hasLinkInJSON(json)).toBe(false);
      expect(editor.getText()).toContain('ss.md');
    } finally {
      editor.destroy();
    }
  });
});
