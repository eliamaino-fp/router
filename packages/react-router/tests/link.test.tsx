import React from 'react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import {
  createLink,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  RouterProvider,
  useLoaderData,
  useSearch,
  redirect,
  useRouteContext,
  useParams,
  Outlet,
} from '../src'

afterEach(() => {
  window.history.replaceState(null, 'root', '/')
  cleanup()
})

describe('Link', () => {
  test('when a Link is disabled', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <React.Fragment>
          <h1>Index</h1>
          <Link to="/posts" disabled>
            Posts
          </Link>
        </React.Fragment>
      ),
    })

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/posts',
      component: () => (
        <React.Fragment>
          <h1>Posts</h1>
        </React.Fragment>
      ),
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(window.location.pathname).toBe('/')

    expect(postsLink).not.toBeDisabled()
    expect(postsLink).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(postsLink)

    await expect(
      screen.findByRole('header', { name: 'Posts' }),
    ).rejects.toThrow()
  })

  it('when the current route is the root', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/" activeProps={{ className: 'active' }}>
              Index
            </Link>
            <Link to="/posts" inactiveProps={{ className: 'inactive' }}>
              Posts
            </Link>
          </React.Fragment>
        )
      },
    })

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/posts',
      component: () => {
        return (
          <React.Fragment>
            <h1>Posts</h1>
          </React.Fragment>
        )
      },
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const indexLink = await screen.findByRole('link', { name: 'Index' })

    expect(window.location.pathname).toBe('/')

    expect(indexLink).toHaveAttribute('aria-current', 'page')
    expect(indexLink).toHaveClass('active')
    expect(indexLink).toHaveAttribute('data-status', 'active')
    expect(indexLink).toHaveAttribute('href', '/')

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(postsLink).toHaveClass('inactive')
    expect(postsLink).toHaveAttribute('href', '/posts')
    expect(postsLink).not.toHaveAttribute('aria-current', 'page')
    expect(postsLink).not.toHaveAttribute('data-status', 'active')
  })

  test('when navigating to /posts', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/">Index</Link>
            <Link to="/posts">Posts</Link>
          </React.Fragment>
        )
      },
    })

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/posts',
      component: () => {
        return (
          <React.Fragment>
            <h1>Posts</h1>
            <Link to="/">Index</Link>
            <Link to="/posts" activeProps={{ className: 'active' }}>
              Posts
            </Link>
          </React.Fragment>
        )
      },
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    fireEvent.click(postsLink)

    expect(
      await screen.findByRole('heading', { name: 'Posts' }),
    ).toBeInTheDocument()

    expect(window.location.pathname).toBe('/posts')

    const indexLink = await screen.findByRole('link', { name: 'Index' })

    expect(window.location.pathname).toBe('/posts')
    expect(indexLink).not.toHaveAttribute('aria-current', 'page')
    expect(indexLink).not.toHaveAttribute('data-status', 'active')
    expect(indexLink).toHaveAttribute('href', '/')

    expect(postsLink).toHaveAttribute('data-status', 'active')
    expect(postsLink).toHaveAttribute('aria-current', 'page')
    expect(postsLink).toHaveClass('active')
    expect(postsLink).toHaveAttribute('href', '/posts')
  })

  test('when navigating to /posts with search', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts" search={{ page: 0 }}>
              Posts
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      const search = useSearch({ strict: false })
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <span>Page: {search.page}</span>
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      validateSearch: (input: Record<string, unknown>) => {
        return {
          page: input.page,
        }
      },
      component: PostsComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(postsLink).toHaveAttribute('href', '/posts?page=0')

    fireEvent.click(postsLink)

    expect(
      await screen.findByRole('heading', { name: 'Posts' }),
    ).toBeInTheDocument()

    expect(window.location.pathname).toBe('/posts')
    expect(window.location.search).toBe('?page=0')

    await screen.findByText('Page: 0')
  })

  test('when navigating to /posts with invalid search', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts" search={{ page: 'invalid' }}>
              Posts
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      const search = useSearch({ strict: false })
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <span>Page: {search.page}</span>
        </React.Fragment>
      )
    }

    const ErrorComponent = () => {
      return <h1>Ooops, something went wrong</h1>
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      errorComponent: ErrorComponent,
      validateSearch: (input: Record<string, unknown>) => {
        const page = Number(input.page)

        if (isNaN(page)) throw Error('Not a number!')

        return {
          page,
        }
      },
      component: PostsComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(postsLink).toHaveAttribute('href', '/posts?page=invalid')

    fireEvent.click(postsLink)

    expect(
      await screen.findByText('Ooops, something went wrong'),
    ).toBeInTheDocument()
  })

  test('when navigating to /posts with a loader', async () => {
    const loader = vi.fn((opts) => {
      return Promise.resolve({ pageDoubled: opts.deps.page.page * 2 })
    })
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts" search={{ page: 2 }}>
              Posts
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      const data = useLoaderData({ strict: false })
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <span>Page: {data.pageDoubled}</span>
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      loaderDeps: (opts) => ({ page: opts.search }),
      loader: loader,
      validateSearch: (input: Record<string, unknown>) => {
        const page = Number(input.page)

        if (isNaN(page)) throw Error('Not a number!')

        return {
          page,
        }
      },
      component: PostsComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(postsLink).toHaveAttribute('href', '/posts?page=2')

    fireEvent.click(postsLink)

    expect(await screen.findByText('Page: 4')).toBeInTheDocument()

    expect(loader).toHaveBeenCalledOnce()
  })

  test('when navigating to /posts with a loader that errors', async () => {
    const onError = vi.fn()
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts" search={{ page: 2 }}>
              Posts
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      const loader = useLoaderData({ strict: false })
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <span>Page: {loader.pageDoubled}</span>
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      loaderDeps: (opts) => ({ page: opts.search }),
      loader: () => {
        throw new Error()
      },
      onError,
      errorComponent: () => <span>Something went wrong!</span>,
      validateSearch: (input: Record<string, unknown>) => {
        const page = Number(input.page)

        if (isNaN(page)) throw Error('Not a number!')

        return {
          page,
        }
      },
      component: PostsComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(postsLink).toHaveAttribute('href', '/posts?page=2')

    fireEvent.click(postsLink)

    expect(await screen.findByText('Something went wrong!'))

    expect(onError).toHaveBeenCalledOnce()
  })

  test('when navigating to /posts with a beforeLoad that redirects', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts" search={{ page: 2 }}>
              Posts
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      return (
        <React.Fragment>
          <h1>Posts</h1>
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      beforeLoad: () => {
        throw redirect({
          to: '/login',
        })
      },
      component: PostsComponent,
    })

    const authRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'login',
      component: () => <h1>Auth!</h1>,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute, authRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    fireEvent.click(postsLink)

    expect(await screen.findByText('Auth!')).toBeInTheDocument()
  })

  test('when navigating to /posts with a beforeLoad that returns context', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts">Posts</Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      const context = useRouteContext({ strict: false })
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <span>UserId: {context.userId}</span>
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      beforeLoad: () => {
        return Promise.resolve({
          userId: 'userId',
        })
      },
      component: PostsComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postsRoute]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    fireEvent.click(postsLink)

    expect(await screen.findByText('UserId: userId')).toBeInTheDocument()
  })

  test('when navigating to /posts with params', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts/$postId" params={{ postId: 'id1' }}>
              To first post
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <Link to="/">Index</Link>
          <Outlet />
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      component: PostsComponent,
    })

    const PostComponent = () => {
      const params = useParams({ strict: false })
      return (
        <React.Fragment>
          <span>Params: {params.postId}</span>
        </React.Fragment>
      )
    }

    const postRoute = createRoute({
      getParentRoute: () => postsRoute,
      path: '$postId',
      component: PostComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        postsRoute.addChildren([postRoute]),
      ]),
    })

    render(<RouterProvider router={router} />)

    const postLink = await screen.findByRole('link', { name: 'To first post' })

    expect(postLink).toHaveAttribute('href', '/posts/id1')

    fireEvent.click(postLink)

    expect(await screen.findByText('Params: id1')).toBeInTheDocument()
  })

  test('when navigating from /posts to ./$postId', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts">Posts</Link>
            <Link to="/posts/$postId" params={{ postId: 'id1' }}>
              To first post
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <Outlet />
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      component: PostsComponent,
    })

    const PostsIndexComponent = () => {
      return (
        <React.Fragment>
          <h1>Posts Index</h1>
          <Link from="/posts/" to="./$postId" params={{ postId: 'id1' }}>
            To the first post
          </Link>
        </React.Fragment>
      )
    }

    const postsIndexRoute = createRoute({
      getParentRoute: () => postsRoute,
      path: '/',
      component: PostsIndexComponent,
    })

    const PostComponent = () => {
      const params = useParams({ strict: false })
      return (
        <React.Fragment>
          <span>Params: {params.postId}</span>
          <Link to="/">Index</Link>
        </React.Fragment>
      )
    }

    const postRoute = createRoute({
      getParentRoute: () => postsRoute,
      path: '$postId',
      component: PostComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        postsRoute.addChildren([postsIndexRoute, postRoute]),
      ]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(postsLink).toHaveAttribute('href', '/posts')

    fireEvent.click(postsLink)

    expect(await screen.findByText('Posts Index')).toBeInTheDocument()

    const postLink = await screen.findByRole('link', {
      name: 'To the first post',
    })

    expect(postLink).toHaveAttribute('href', '/posts/id1')
    expect(postLink).toHaveAttribute('from', '/posts/')

    fireEvent.click(postLink)

    expect(await screen.findByText('Params: id1')).toBeInTheDocument()

    expect(window.location.pathname).toBe('/posts/id1')
  })

  test('when navigating from /posts to ../posts/$postId', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => {
        return (
          <React.Fragment>
            <h1>Index</h1>
            <Link to="/posts">Posts</Link>
            <Link to="/posts/$postId" params={{ postId: 'id1' }}>
              To first post
            </Link>
          </React.Fragment>
        )
      },
    })

    const PostsComponent = () => {
      return (
        <React.Fragment>
          <h1>Posts</h1>
          <Outlet />
        </React.Fragment>
      )
    }

    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
      component: PostsComponent,
    })

    const PostsIndexComponent = () => {
      return (
        <React.Fragment>
          <h1>Posts Index</h1>
          <Link from="/posts/" to="../posts/$postId" params={{ postId: 'id1' }}>
            To the first post
          </Link>
        </React.Fragment>
      )
    }

    const postsIndexRoute = createRoute({
      getParentRoute: () => postsRoute,
      path: '/',
      component: PostsIndexComponent,
    })

    const PostComponent = () => {
      const params = useParams({ strict: false })
      return (
        <React.Fragment>
          <span>Params: {params.postId}</span>
          <Link to="/">Index</Link>
        </React.Fragment>
      )
    }

    const postRoute = createRoute({
      getParentRoute: () => postsRoute,
      path: '$postId',
      component: PostComponent,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        postsRoute.addChildren([postsIndexRoute, postRoute]),
      ]),
    })

    render(<RouterProvider router={router} />)

    const postsLink = await screen.findByRole('link', { name: 'Posts' })

    expect(postsLink).toHaveAttribute('href', '/posts')

    fireEvent.click(postsLink)

    expect(await screen.findByText('Posts Index')).toBeInTheDocument()

    const postLink = await screen.findByRole('link', {
      name: 'To the first post',
    })

    expect(postLink).toHaveAttribute('href', '/posts/id1')
    expect(postLink).toHaveAttribute('from', '/posts/')

    fireEvent.click(postLink)

    expect(await screen.findByText('Params: id1')).toBeInTheDocument()
  })
})

describe('createLink', () => {
  it('should pass the "disabled" prop to the rendered target element', async () => {
    const CustomLink = createLink('button')

    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CustomLink to="/" disabled>
          Index
        </CustomLink>
      ),
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
    })

    render(<RouterProvider router={router} />)

    const customElement = await screen.findByText('Index')

    expect(customElement).toBeDisabled()
    expect(customElement.getAttribute('disabled')).toBe('')
  })

  it('should pass the "foo" prop to the rendered target element', async () => {
    const CustomLink = createLink('button')

    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <CustomLink
          to="/"
          // @ts-expect-error
          foo="bar"
        >
          Index
        </CustomLink>
      ),
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })

    await router.load()

    const rendered = render(<RouterProvider router={router} />)
    const customElement = await rendered.findByText('Index')

    expect(customElement.hasAttribute('foo')).toBe(true)
    expect(customElement.getAttribute('foo')).toBe('bar')
  })
})
