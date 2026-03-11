import readXlsxFile from "read-excel-file/node";
import type { LeaseData } from "../../src/types/lease";
import fs from "fs";

let unitData: LeaseData = {};

function toIsoDate(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

readXlsxFile("../raw_data/leaseData.xlsx").then((rows) => {
  for (let i = 1; i < rows.length; i++) {
    let unit = rows[i];
    let unitNumber = String(unit[0]);
    unitData[unitNumber] = {
      unitType: String(unit[1]),
      description: String(unit[2]),
      unitArea: Number(unit[3]),
      leaseStartDate: toIsoDate(unit[4]),
      leaseEndDate: toIsoDate(unit[5]),
      leaseTerm: Number(unit[6]),
      rent: Number(unit[7]),
      psf: Math.round(Number(unit[8]) * 10) / 10,
      freeMonths: Number(unit[9]),
      netRent: Math.round(Number(unit[10])),
      leasingAssociate: String(unit[11]),
      affordable: Boolean(unit[12] == "Yes" ? true : false),
    };
  }
  fs.writeFile("../data/lease_data.json", JSON.stringify(unitData), (err) => {
    console.log(err);
  });
});
