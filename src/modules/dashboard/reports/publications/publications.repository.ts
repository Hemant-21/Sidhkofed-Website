/**
 * The ONLY Prisma caller for the publications sub-module (coding-standards §6).
 */
import { prisma } from '@/db/prisma';
import type { Prisma } from '@prisma/client';

function findFinancialYearById(id: string) {
  return prisma.financialYear.findUnique({ where: { id } });
}

function findFinancialYearWithCurrentPublication(id: string) {
  return prisma.financialYear.findUnique({
    where: { id },
    include: { currentReportPublication: { include: { publishedBy: { select: { id: true, fullName: true, email: true } } } } },
  });
}

function listPublicationHistory(financialYearId: string) {
  return prisma.reportPublication.findMany({
    where: { financialYearId },
    orderBy: { publishedAt: 'desc' },
    include: { publishedBy: { select: { id: true, fullName: true, email: true } } },
  });
}

function findPublicationById(id: string) {
  return prisma.reportPublication.findUnique({
    where: { id },
    include: { publishedBy: { select: { id: true, fullName: true, email: true } } },
  });
}

/** Public read: the currently-live publication for a FY (or for whichever FY's label is given). */
function findCurrentPublicationByFinancialYearId(financialYearId: string) {
  return prisma.financialYear.findUnique({
    where: { id: financialYearId },
    include: { currentReportPublication: true },
  });
}

function findCurrentPublicationByFinancialYearLabel(label: string) {
  return prisma.financialYear.findUnique({
    where: { label },
    include: { currentReportPublication: true },
  });
}

function listPublishedFinancialYears() {
  return prisma.financialYear.findMany({
    where: { currentReportPublicationId: { not: null } },
    orderBy: { startDate: 'desc' },
    include: { currentReportPublication: { select: { publishedAt: true } } },
  });
}

function listAllFinancialYears() {
  return prisma.financialYear.findMany({ orderBy: { startDate: 'desc' } });
}

export interface CreatePublicationInput {
  financialYearId: string;
  calculationVersion: number;
  fyStartDate: Date;
  fyEndDate: Date;
  programmeReport: Prisma.InputJsonValue;
  districtReport: Prisma.InputJsonValue;
  commodityReport: Prisma.InputJsonValue;
  generatedAt: Date;
  publishedById: string;
}

/**
 * Atomically creates the new publication row and repoints `FinancialYear.currentReportPublicationId`
 * at it — one transaction, so "all three reports switch together" is structural, not a race.
 */
async function createPublicationAndRepoint(input: CreatePublicationInput) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.reportPublication.create({ data: input });
    await tx.financialYear.update({
      where: { id: input.financialYearId },
      data: { currentReportPublicationId: created.id },
    });
    return created;
  });
}

export const publicationsRepository = {
  findFinancialYearById,
  findFinancialYearWithCurrentPublication,
  listPublicationHistory,
  findPublicationById,
  findCurrentPublicationByFinancialYearId,
  findCurrentPublicationByFinancialYearLabel,
  listPublishedFinancialYears,
  listAllFinancialYears,
  createPublicationAndRepoint,
};

export type PublicationsRepository = typeof publicationsRepository;
