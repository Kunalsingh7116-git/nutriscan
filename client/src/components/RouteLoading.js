import ShimmerSkeleton from './ui/ShimmerSkeleton';

export default function RouteLoading() {
  return <div className="page route-loading" role="status" aria-label="Opening page">
    <div aria-hidden="true"><ShimmerSkeleton className="route-loading-title" label="Loading heading" />
    <ShimmerSkeleton className="route-loading-subtitle" label="Loading description" />
    <div className="route-loading-panels"><ShimmerSkeleton label="Loading page content" /><ShimmerSkeleton label="Loading page content" /></div></div>
  </div>;
}
