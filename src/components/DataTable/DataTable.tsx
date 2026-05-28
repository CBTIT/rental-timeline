import { useMemo, useState } from "react";

import "./DataTable.css";
import type { LeaseData } from "../../types/lease";

type Props = {
  unitData: LeaseData | null;
};

type SortKey =
  | "unit"
  | "type"
  | "area"
  | "leaseTerm"
  | "leaseStartDate"
  | "leaseEndDate"
  | "associate"
  | "affordable";

type SortDir = "asc" | "desc";

function toggleDir(prev: SortDir) {
  return prev === "asc" ? "desc" : "asc";
}

function parseLeaseDateLike(v: unknown): number | null {
  if (!v) return null;
  const t = String(v).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  // M/D/YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  // fallback parse (if you ever get other formats)
  const d = new Date(t);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function parseNumberLike(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).replace(/,/g, "").trim();
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function compareNullable(a: number | string | null, b: number | string | null) {
  // nulls last
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // number vs string
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export default function DataTable({ unitData }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("unit");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    if (!unitData) return [];

    const entries = Object.entries(unitData);

    const getSortValue = (unitId: string) => {
      const row = unitData[unitId];

      switch (sortKey) {
        case "unit": {
          const n = Number(unitId);
          return Number.isFinite(n) ? n : unitId;
        }
        case "associate":
          return row.leasingAssociate.trim().toLowerCase();

        case "affordable":
          return row.affordable ? "yes" : "no";
        case "type":
          return row.unitType.trim().toLowerCase();
        case "area":
          return parseNumberLike(row.unitArea);
        case "leaseTerm":
          return parseNumberLike(row.leaseTerm);

        case "leaseStartDate":
          return parseLeaseDateLike(row.leaseStartDate);
        case "leaseEndDate":
          return parseLeaseDateLike(row.leaseEndDate);

        default:
          return unitId;
      }
    };

    entries.sort(([aId], [bId]) => {
      const av = getSortValue(aId);
      const bv = getSortValue(bId);
      const cmp = compareNullable(av as any, bv as any);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return entries;
  }, [unitData, sortKey, sortDir]);

  if (!unitData) return null;

  const onHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => toggleDir(d));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return "↕";
    return sortDir === "asc" ? "▲" : "▼";
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("unit")}
            >
              Unit {sortIcon("unit")}
            </th>

            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("type")}
            >
              Type {sortIcon("type")}
            </th>
            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("affordable")}
            >
              Affordable {sortIcon("affordable")}
            </th>
            <th>Description</th>

            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("area")}
            >
              Area {sortIcon("area")}
            </th>

            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("leaseStartDate")}
            >
              Lease Start Date {sortIcon("leaseStartDate")}
            </th>

            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("leaseEndDate")}
            >
              Lease End Date {sortIcon("leaseEndDate")}
            </th>

            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("leaseTerm")}
            >
              Lease Term {sortIcon("leaseTerm")}
            </th>

            <th
              className="sortable"
              role="button"
              onClick={() => onHeaderClick("associate")}
            >
              Leasing Associate {sortIcon("associate")}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map(([unitId, dataRow]) => (
            <tr key={unitId} className="row">
              <td className="data">{unitId}</td>
              <td className="data">{dataRow.unitType}</td>
              <td className="data">{dataRow.affordable ? "Yes" : "No"}</td>
              <td className="data">{dataRow.description}</td>
              <td className="data">{dataRow.unitArea}</td>
              <td className="data">{dataRow.leaseStartDate}</td>
              <td className="data">{dataRow.leaseEndDate}</td>
              <td className="data">{dataRow.leaseTerm}</td>
              <td className="data">{dataRow.leasingAssociate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
