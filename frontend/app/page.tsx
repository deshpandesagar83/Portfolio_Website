import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { CommentsPlaceholder } from '@/components/sections/CommentsPlaceholder';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <CommentsPlaceholder />
      </main>
      <Footer />
    </>
  );
}
