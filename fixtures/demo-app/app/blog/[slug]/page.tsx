export async function generateMetadata() {
  return { title: 'Post' }
}

export async function generateStaticParams() {
  return []
}

export const dynamic = 'force-static'

export default async function BlogPost() {
  return null
}
