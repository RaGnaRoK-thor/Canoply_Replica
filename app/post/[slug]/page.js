import HtmlInjector from '../../../components/HtmlInjector';
export default function Post({ params }){
  const { slug } = params;
  return <HtmlInjector src={`/post/${slug}.html`} />;
}
