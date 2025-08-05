import {type PageProps} from '$fresh/server.ts'

export default function App({Component}: PageProps) {
  return (
    <html lang="en" class="h-full antialiased">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Journals</title>
        <link rel="stylesheet" href="/styles/main.css" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
      </head>
      <body class="flex h-full bg-zinc-50 dark:bg-black">
        <div class="flex w-full">
          <Component />
        </div>
      </body>
    </html>
  )
}
