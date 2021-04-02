import { useEffect, useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

// import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  estimated_read_time?: number;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  if (isFallback) {
    return <p>Carregando...</p>;
  }

  const [formattedPost, setFormattedPost] = useState<Post>(post);

  useEffect(() => {
    const post_number_of_words = post.data.content.reduce((sum, content) => {
      const heading_num_of_words = content.heading.split(' ').length;

      const body_num_of_words = content.body.reduce((sumBody, body) => {
        const num_of_words = body.text.split(' ').length;

        return sumBody + num_of_words;
      }, 0);

      const subtotal = heading_num_of_words + body_num_of_words;

      return sum + subtotal;
    }, 0);

    const newPost = {
      ...post,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
      estimated_read_time: Math.ceil(post_number_of_words / 200), // person ~200 words p/min
    };

    setFormattedPost(newPost);
  }, [post]);

  return (
    <>
      <Header />

      <img
        src={formattedPost.data.banner.url}
        className={styles.bannerImg}
        alt="banner"
      />

      <main className={styles.container}>
        <div className={styles.posts}>
          <h1>{formattedPost.data.title}</h1>

          <div className={styles.info}>
            <div>
              <FiCalendar />
              <time>{formattedPost.first_publication_date}</time>
            </div>
            <div>
              <FiUser />
              <p>{formattedPost.data.author}</p>
            </div>
            <div>
              <FiClock />
              <p>{formattedPost.estimated_read_time} min</p>
            </div>
          </div>

          <div className={styles.content}>
            {formattedPost.data.content.map(singleContent => (
              <div key={singleContent.heading}>
                <h2>{singleContent.heading}</h2>
                {singleContent.body.map(singleBody => (
                  <p key={singleBody.text}>{singleBody.text}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title'],
      pageSize: 1,
    }
  );

  const formattedPostsPaths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths: formattedPostsPaths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(singleContent => {
        return {
          ...singleContent,
          body: singleContent.body.map(singleBody => {
            return {
              type: singleBody.type,
              text: singleBody.text,
              spans: singleBody.spans,
            };
          }),
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
