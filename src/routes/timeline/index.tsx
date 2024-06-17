export default function Timelines() {
  return (
    <main class="flex flex-col items-center justify-center">
      <img
        class="my-6"
        src="/logo.svg"
        width="128"
        height="128"
        alt="the Fresh logo: a sliced lemon dripping with juice"
      />
      <h1 class="text-4xl font-bold">Welcome to your Timelines</h1>
      <menu class="mt-4">
        <li>
          <a href="/timeline/create">Create new timline</a>
        </li>
      </menu>
    </main>
  )
}
