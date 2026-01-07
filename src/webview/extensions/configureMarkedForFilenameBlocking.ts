/**
 * Copyright (c) 2025-2026 Concret.io
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

/**
 * Configure marked library to prevent auto-linking of filenames
 *
 * CRITICAL: This MUST run synchronously BEFORE TipTap's Markdown extension uses marked.
 * We override marked's renderer to prevent it from creating <a> tags for .md filenames.
 * The renderer approach works because marked uses it during HTML generation, and TipTap
 * processes the HTML or tokens before converting to ProseMirror nodes.
 */

import { Extension } from '@tiptap/core';

/**
 * Configure marked's renderer to block filename links
 * This prevents marked from creating link HTML for bare filenames
 */
function configureMarkedRenderer(marked: any): void {
  try {
    // Get the default renderer or create a new one
    const renderer = marked.defaults?.renderer || new marked.Renderer();
    
    // Store the original link method
    const originalLink = renderer.link?.bind(renderer) || function(href: string, title: string | null, text: string): string {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    };
    
    // Override the link renderer to prevent .md files from becoming links
    renderer.link = function(href: string, title: string | null, text: string): string {
      // Don't create links for bare filenames ending in file extensions
      // Pattern: filename matches bare filename pattern (no path separators, no protocols)
      const filenamePattern = /^[^/\s\\:<>"'`]+\.(md|txt|csv|json|yml|yaml|xml|html|css|js|ts|py|rb|go|rs|php|java|cpp|c|h|hpp|sh|bat|ps1|sql|db|sqlite|log|ini|cfg|conf|lock|lockfile|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|tar|gz|rar|7z|png|jpg|jpeg|gif|webp|svg|bmp|ico|mp4|mp3|avi|mov|wav|flac|woff|woff2|ttf|otf|eot)$/i;
      
      // If href matches filename pattern and equals text (bare filename, not explicit link)
      // Return plain text instead of a link
      if (filenamePattern.test(href) && href === text) {
        return text; // Return plain text instead of link
      }
      
      // For all other links (URLs, paths, explicit markdown links), render normally
      return originalLink(href, title, text);
    };
    
    // Apply the renderer to marked using setOptions
    marked.setOptions({ renderer });
    
    console.log('[MD4H] Configured marked renderer to block filename autolinks');
  } catch (error) {
    console.warn('[MD4H] Error configuring marked renderer:', error);
  }
}

// Configure marked IMMEDIATELY when module loads (browser only)
// This runs synchronously before TipTap initializes
if (typeof window !== 'undefined') {
  // Use dynamic import but configure immediately when it resolves
  const markedPromise = import('marked');
  
  // Configure as soon as marked is available
  markedPromise.then(({ marked }) => {
    configureMarkedRenderer(marked);
  }).catch(() => {
    // In Jest/test environment, marked might not be available - that's OK
  });
}

export const ConfigureMarkedForFilenameBlocking = Extension.create({
  name: 'configureMarkedForFilenameBlocking',

  priority: 2000, // Very high priority to run before Markdown extension

  onCreate() {
    // Ensure marked is configured when editor is created
    // This is a fallback in case the module-level configuration didn't run
    if (typeof window !== 'undefined') {
      import('marked')
        .then(({ marked }) => {
          configureMarkedRenderer(marked);
        })
        .catch(() => {
          // Silently fail if marked is not available (e.g., in test environments)
        });
    }
  },
});
