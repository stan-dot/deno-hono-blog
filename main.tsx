import { Hono } from "hono"
import { serveStatic } from "hono/deno"
import matter from "gray-matter"
import { marked } from "marked"

const app = new Hono()

// ---- Config -------------------------------------------------

const POSTS_DIR = "./posts"

// ---- JSX Layout --------------------------------------------

function Layout(props: {
  title: string
  children: unknown
}) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{props.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body {
            font-family: system-ui, sans-serif;
            max-width: 720px;
            margin: 2rem auto;
            padding: 0 1rem;
            line-height: 1.6;
          }
          a { color: #2563eb; text-decoration: none; }
          h1, h2, h3 { margin-top: 2rem; }
          .post-meta { color: #666; font-size: 0.9rem; }
        `}</style>
      </head>
      <body>{props.children}</body>
    </html>
  )
}

// ---- Helpers -----------------------------------------------

async function loadPost(slug: string) {
  const path = `${POSTS_DIR}/${slug}.md`
  const raw = await Deno.readTextFile(path)
  const { data, content } = matter(raw)
  const html = marked.parse(content)

  return {
    frontmatter: data as {
      title?: string
      date?: string
    },
    html,
  }
}

async function listPosts() {
  const posts: { slug: string }[] = []

  for await (const entry of Deno.readDir(POSTS_DIR)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      posts.push({ slug: entry.name.replace(".md", "") })
    }
  }

  return posts
}

// ---- Routes ------------------------------------------------

// Home: list posts
app.get("/", async (c) => {
  const posts = await listPosts()

  return c.html(
    <Layout title="My Blog">
      <h1>My Blog</h1>
      <ul>
        {posts.map((p) => (
          <li>
            <a href={`/post/${p.slug}`}>{p.slug}</a>
          </li>
        ))}
      </ul>
    </Layout>
  )
})

// Blog post page
app.get("/post/:slug", async (c) => {
  const slug = c.req.param("slug")

  try {
    const post = await loadPost(slug)

    return c.html(
      <Layout title={post.frontmatter.title ?? slug}>
        <h1>{post.frontmatter.title ?? slug}</h1>
        {post.frontmatter.date && (
          <div class="post-meta">{post.frontmatter.date}</div>
        )}
        <div dangerouslySetInnerHTML={{ __html: post.html }} />
        <p>
          <a href="/">← Back</a>
        </p>
      </Layout>
    )
  } catch {
    return c.notFound()
  }
})

// Optional static support (images, css later)
app.use("/static/*", serveStatic({ root: "./" }))

// ---- Start -------------------------------------------------

Deno.serve(app.fetch)
