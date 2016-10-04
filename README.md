# sourcemap-issue

Sourcemap issue unable to trace back to original with name mappings intact.

test-jquery and test-ember illustrate the issue with optimize-js and sorcery.

If we don't add mappings for ast nodes it will lose all the names and resolution of the minified map.

If we add mappings for all the nodes, we have more mappings than are in the minified map which hits a fallback path in sorcery that generates fallbacks to the start of the line which is extra problematic with minified source maps.

