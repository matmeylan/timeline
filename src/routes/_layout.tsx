import {PageProps} from '$fresh/server.ts'

export default function Layout({Component}: PageProps) {
  // do something with state here
  return (
    <div class="px-4 py-8 mx-auto bg-[#86efac]">
      <div class="max-w-screen-lg">
        <Component />
      </div>
    </div>
  )
}
