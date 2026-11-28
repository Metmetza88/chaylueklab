import { dashboardSample, sampleGroups } from "@/lib/dashboard-samples";

export default function DashboardThumbnail({
  slug,
  name,
  tagline,
}: {
  slug: string;
  name: string;
  tagline: string;
}) {
  const sample = dashboardSample(slug, tagline);
  const groups = sampleGroups(sample.rows);
  const ceiling = Math.max(...groups.map(({ average }) => average), 1);
  return (
    <div
      className="sample-thumbnail"
      role="img"
      aria-label={`หน้าจอตัวอย่าง ${name} · ${sample.title} · ข้อมูลสมมติ`}
    >
      <header>
        <b>{name}</b>
        <small>ข้อมูลสมมติ</small>
      </header>
      <strong>{sample.title}</strong>
      <div className="sample-thumbnail-metrics">
        <div>
          <b>{sample.rows.length}</b>
          <small>รายการ</small>
        </div>
        <div>
          <b>{groups.length}</b>
          <small>{sample.group}</small>
        </div>
        <div>
          <b>{ceiling}</b>
          <small>ค่าสูงสุดรายกลุ่ม</small>
        </div>
      </div>
      <div className="sample-thumbnail-data">
        <div aria-hidden="true" className="sample-mini-bars">
          {groups.map(({ name, average }) => (
            <i
              key={name}
              style={{ height: `${Math.max(12, (average / ceiling) * 88)}%` }}
            />
          ))}
        </div>
        <div className="sample-mini-rows">
          <b>{sample.field}</b>
          {sample.rows.slice(0, 2).map(([id, title, , amount]) => (
            <div key={id}>
              <span>{title}</span>
              <b>{amount}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
