"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { classes, exports, notifications } from "@/db/schema";
import { getDosenClassReportsPath, slugifyTitle } from "@/features/classes/urls";
import { ClassReportDocument } from "@/features/exports/class-report-document";
import { getClassReportData } from "@/features/exports/data";
import { buildExportStoragePath, EXPORTS_BUCKET } from "@/features/exports/storage";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { z } from "@/lib/validators";

async function buildExcelReport(report: NonNullable<Awaited<ReturnType<typeof getClassReportData>>>) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Kelas");

  worksheet.columns = [
    { header: "No", key: "number", width: 6 },
    { header: "Nama", key: "name", width: 28 },
    { header: "Email", key: "email", width: 34 },
    { header: "Progress (%)", key: "progressPercent", width: 15 },
    { header: "Nilai Akhir", key: "finalScore", width: 14 },
    { header: "Status Sertifikat", key: "certificateStatus", width: 20 },
    { header: "Nomor Sertifikat", key: "certificateNumber", width: 28 },
  ];

  report.students.forEach((student, index) => {
    worksheet.addRow({
      ...student,
      number: index + 1,
    });
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: "FF134E4A" } };
  worksheet.getRow(1).fill = {
    fgColor: { argb: "FFCCFBF1" },
    pattern: "solid",
    type: "pattern",
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function generateClassExportAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      classId: z.uuid(),
      format: z.enum(["excel", "pdf"]),
    })
    .safeParse({
      classId: formData.get("classId"),
      format: formData.get("format"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_export");
  }

  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
    })
    .from(classes)
    .where(and(eq(classes.id, parsed.data.classId), eq(classes.createdBy, profile.id)))
    .limit(1);
  const classItem = classRows[0] ?? null;

  if (!classItem) {
    redirect("/dosen/dashboard?error=class_not_found");
  }

  const classPath = getDosenClassReportsPath(classItem);
  const [exportItem] = await db
    .insert(exports)
    .values({
      classId: classItem.id,
      format: parsed.data.format,
      requestedBy: profile.id,
      status: "processing",
    })
    .returning({ id: exports.id });

  try {
    const report = await getClassReportData(classItem.id);

    if (!report) {
      throw new Error("Class report data not found.");
    }

    const fileExtension = parsed.data.format === "excel" ? "xlsx" : "pdf";
    const fileName = `laporan-${slugifyTitle(classItem.title)}-${exportItem.id.slice(0, 8)}.${fileExtension}`;
    const fileStoragePath = buildExportStoragePath({
      exportId: exportItem.id,
      fileName,
      requesterId: profile.id,
    });
    const fileBuffer =
      parsed.data.format === "excel"
        ? await buildExcelReport(report)
        : await renderToBuffer(
            <ClassReportDocument
              classTitle={report.classItem.title}
              generatedAt={report.generatedAt}
              students={report.students}
            />,
          );
    const supabase = await createClient();
    const { error } = await supabase.storage.from(EXPORTS_BUCKET).upload(fileStoragePath, fileBuffer, {
      contentType:
        parsed.data.format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
      upsert: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(exports)
        .set({
          completedAt: now,
          fileName,
          fileStoragePath,
          metadata: {
            studentCount: report.students.length,
          },
          status: "completed",
          updatedAt: now,
        })
        .where(eq(exports.id, exportItem.id));

      await tx.insert(notifications).values({
        body: `Laporan ${parsed.data.format.toUpperCase()} kelas "${classItem.title}" siap diunduh.`,
        entityId: exportItem.id,
        entityType: "exports",
        recipientId: profile.id,
        title: "Export laporan selesai",
      });
    });

    await writeAuditLog({
      action: "exports.completed",
      entityId: exportItem.id,
      entityType: "exports",
      metadata: {
        class_id: classItem.id,
        format: parsed.data.format,
      },
    });

  } catch (error) {
    await db
      .update(exports)
      .set({
        errorMessage: error instanceof Error ? error.message : "Unknown export error",
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(exports.id, exportItem.id));

    redirect(`${classPath}?error=export_failed`);
  }

  revalidatePath(classPath);
  redirect(`${classPath}?export_completed=1`);
}
