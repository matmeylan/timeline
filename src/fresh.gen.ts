// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_slug_ from "./routes/[slug].tsx";
import * as $_slug_edit_entryId_ from "./routes/[slug]/edit/[entryId].tsx";
import * as $_slug_write from "./routes/[slug]/write.tsx";
import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $_layout from "./routes/_layout.tsx";
import * as $api_files_download_index from "./routes/api/files/download/index.ts";
import * as $api_files_upload_index from "./routes/api/files/upload/index.ts";
import * as $api_files_upload_local from "./routes/api/files/upload/local.ts";
import * as $index from "./routes/index.tsx";
import * as $journals from "./routes/journals.tsx";
import * as $start from "./routes/start.tsx";
import * as $content_editor_content_editor from "./islands/content-editor/content-editor.tsx";
import type { Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/[slug].tsx": $_slug_,
    "./routes/[slug]/edit/[entryId].tsx": $_slug_edit_entryId_,
    "./routes/[slug]/write.tsx": $_slug_write,
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/_layout.tsx": $_layout,
    "./routes/api/files/download/index.ts": $api_files_download_index,
    "./routes/api/files/upload/index.ts": $api_files_upload_index,
    "./routes/api/files/upload/local.ts": $api_files_upload_local,
    "./routes/index.tsx": $index,
    "./routes/journals.tsx": $journals,
    "./routes/start.tsx": $start,
  },
  islands: {
    "./islands/content-editor/content-editor.tsx":
      $content_editor_content_editor,
  },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
