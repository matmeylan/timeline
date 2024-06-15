import {PageProps} from '$fresh/server.ts'

export default function Greet(props: PageProps) {
  return (
    <div>
      Hello {decodeURIComponent(props.params.name)}, accesing on {props.route}
    </div>
  )
}
