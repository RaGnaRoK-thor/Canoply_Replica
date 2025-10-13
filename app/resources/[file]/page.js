import HtmlInjector from '../../../components/HtmlInjector';
export default function Resource({ params }){
  const { file } = params;
  return <HtmlInjector src={`/resources/${file}.html`} />;
}
