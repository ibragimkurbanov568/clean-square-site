import Spinner from './Spinner';

export function FullPageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center" role="status" aria-busy="true">
      <Spinner size={28} className="text-accent" />
      <span className="sr-only">Загрузка содержимого</span>
    </div>
  );
}

export default FullPageLoader;
