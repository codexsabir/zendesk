export function TicketSkeleton() {
  return (
    <>
      <div className="skel line lg" />
      <div className="skel line" />
      <div className="skel line" />
    </>
  );
}

export function CustomerSkeleton() {
  return (
    <div className="row cols-2">
      <div>
        <div className="skel line" style={{ width: '60%', height: 20, borderRadius: 10 }} />
        <div className="skel line" />
        <div className="skel line sm" />
        <div className="skel line" />
      </div>
      <div>
        <div className="skel line" />
        <div className="skel line sm" />
        <div className="skel line" />
      </div>
    </div>
  );
}