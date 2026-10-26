import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getInstallations = async (req: Request, res: Response) => {
  try {
    const { status, search, customer_id } = req.query;
    const where: any = {};

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        where.status = { in: ['IN_PROGRESS', 'SCHEDULED', 'PENDING'] };
      } else {
        where.status = String(status);
      }
    }

    if (customer_id) {
      where.customer_id = String(customer_id);
    }

    if (search) {
      const q = String(search);
      where.OR = [
        { job_no: { contains: q } },
        { customer: { name: { contains: q } } },
        { assigned_technician: { contains: q } },
        { address: { contains: q } },
      ];
    }

    const [installations, allProducts, allJobsForStats] = await Promise.all([
      prisma.installation.findMany({
        where,
        include: {
          customer: true,
          sale: {
            include: {
              items: true,
              payments: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.product.findMany({
        include: {
          category: true,
          brand: true,
        },
      }),
      prisma.installation.findMany({
        select: {
          id: true,
          status: true,
          system_capacity_kw: true,
        },
      }),
    ]);

    const prodMap = new Map(allProducts.map((p) => [p.id, p]));

    // Format installations with enriched equipment & parsed checklists
    const formatted = installations.map((inst) => {
      let parsedChecklist: any = {};
      let parsedTestResults: any = {};

      try {
        if (inst.checklist_json) parsedChecklist = JSON.parse(inst.checklist_json);
      } catch (e) {
        parsedChecklist = {};
      }

      try {
        if (inst.test_results_json) parsedTestResults = JSON.parse(inst.test_results_json);
      } catch (e) {
        parsedTestResults = {};
      }

      const enrichedItems = (inst.sale?.items || []).map((item) => {
        const prod = prodMap.get(item.product_id);
        let serials: string[] = [];
        try {
          if (item.serial_numbers_json) serials = JSON.parse(item.serial_numbers_json);
        } catch (e) {
          serials = [];
        }

        return {
          id: item.id,
          product_id: item.product_id,
          product_name: prod?.name || 'Solar Equipment',
          product_sku: prod?.model_number || '',
          brand_name: prod?.brand?.name || 'OEM',
          category_name: prod?.category?.name || 'General',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          serial_numbers: serials,
        };
      });

      const totalEquipmentCost = enrichedItems.reduce((acc, it) => acc + it.total_price, 0);
      const totalEquipmentQty = enrichedItems.reduce((acc, it) => acc + it.quantity, 0);

      // Checklist completeness score
      const standardKeys = [
        'panels_mounted',
        'inverter_installed',
        'batteries_connected',
        'structure_torqued',
        'dc_wiring_done',
        'earthing_bore_tested',
        'inverter_tested',
        'customer_handover',
      ];
      const completedStepsCount = standardKeys.filter((k) => Boolean(parsedChecklist[k])).length;
      const checklistProgressPct = Math.round((completedStepsCount / standardKeys.length) * 100);

      return {
        ...inst,
        checklist: parsedChecklist,
        test_results: parsedTestResults,
        checklist_progress_pct: checklistProgressPct,
        checklist_completed_steps: completedStepsCount,
        checklist_total_steps: standardKeys.length,
        equipment: enrichedItems,
        total_equipment_cost: totalEquipmentCost,
        total_equipment_qty: totalEquipmentQty,
        sale_summary: inst.sale
          ? {
              invoice_no: inst.sale.invoice_no,
              total_amount: inst.sale.grand_total,
              paid_amount: inst.sale.paid_amount,
              balance_due: inst.sale.balance_due,
              created_at: inst.sale.created_at,
            }
          : null,
      };
    });

    // Compute live summary stats
    const totalJobs = allJobsForStats.length;
    const completedJobs = allJobsForStats.filter((j) => j.status === 'COMPLETED').length;
    const inProgressJobs = allJobsForStats.filter((j) => j.status === 'IN_PROGRESS').length;
    const pendingJobs = allJobsForStats.filter((j) => j.status === 'PENDING' || j.status === 'SCHEDULED').length;
    const totalKwInstalled = allJobsForStats
      .filter((j) => j.status === 'COMPLETED')
      .reduce((acc, j) => acc + (j.system_capacity_kw || 0), 0);
    const totalKwCapacity = allJobsForStats.reduce((acc, j) => acc + (j.system_capacity_kw || 0), 0);

    const summary = {
      total: totalJobs,
      completed: completedJobs,
      in_progress: inProgressJobs,
      pending: pendingJobs,
      total_kw_completed: Math.round(totalKwInstalled * 100) / 100,
      total_kw_all: Math.round(totalKwCapacity * 100) / 100,
    };

    return sendSuccess(res, formatted, 'Installations retrieved', 200, { summary });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getInstallationHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const targetJob = await prisma.installation.findUnique({
      where: { id },
      include: {
        customer: true,
        sale: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!targetJob) {
      return sendError(res, 'Installation job not found', 404);
    }

    // Fetch all installations for this customer to show complete customer history
    const customerAllJobs = await prisma.installation.findMany({
      where: { customer_id: targetJob.customer_id },
      orderBy: { created_at: 'desc' },
      include: {
        sale: {
          select: {
            invoice_no: true,
            grand_total: true,
            paid_amount: true,
            balance_due: true,
          },
        },
      },
    });

    const allProducts = await prisma.product.findMany({
      include: { category: true, brand: true },
    });
    const prodMap = new Map(allProducts.map((p) => [p.id, p]));

    const enrichedItems = (targetJob.sale?.items || []).map((item) => {
      const prod = prodMap.get(item.product_id);
      let serials: string[] = [];
      try {
        if (item.serial_numbers_json) serials = JSON.parse(item.serial_numbers_json);
      } catch (e) {
        serials = [];
      }
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: prod?.name || 'Solar Equipment',
        product_sku: prod?.model_number || '',
        brand_name: prod?.brand?.name || 'OEM',
        category_name: prod?.category?.name || 'General',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        serial_numbers: serials,
      };
    });

    let checklist: any = {};
    let testResults: any = {};
    try {
      if (targetJob.checklist_json) checklist = JSON.parse(targetJob.checklist_json);
    } catch (e) {}
    try {
      if (targetJob.test_results_json) testResults = JSON.parse(targetJob.test_results_json);
    } catch (e) {}

    const totalKwCustomer = customerAllJobs.reduce((acc, j) => acc + (j.system_capacity_kw || 0), 0);
    const completedCustomerJobs = customerAllJobs.filter((j) => j.status === 'COMPLETED').length;

    return sendSuccess(res, {
      current_job: {
        ...targetJob,
        checklist,
        test_results: testResults,
        equipment: enrichedItems,
      },
      customer: targetJob.customer,
      customer_installations: customerAllJobs,
      customer_stats: {
        total_projects: customerAllJobs.length,
        completed_projects: completedCustomerJobs,
        total_kw: Math.round(totalKwCustomer * 100) / 100,
      },
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const completeInstallation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completion_notes, test_results } = req.body;

    const existing = await prisma.installation.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Installation job not found', 404);
    }

    // Default all 8 checklist steps to true on complete
    const fullChecklist: any = {
      panels_mounted: true,
      inverter_installed: true,
      batteries_connected: true,
      structure_torqued: true,
      dc_wiring_done: true,
      earthing_bore_tested: true,
      inverter_tested: true,
      customer_handover: true,
    };

    const updatePayload: any = {
      status: 'COMPLETED',
      completed_date: new Date(),
      checklist_json: JSON.stringify(fullChecklist),
    };

    if (completion_notes) {
      updatePayload.notes = existing.notes
        ? `${existing.notes}\n[Completed on ${new Date().toLocaleDateString()}]: ${completion_notes}`
        : completion_notes;
    }

    if (test_results) {
      updatePayload.test_results_json =
        typeof test_results === 'string' ? test_results : JSON.stringify(test_results);
    }

    const updated = await prisma.installation.update({
      where: { id },
      data: updatePayload,
      include: { customer: true, sale: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Installation',
      entityId: id,
      newData: { status: 'COMPLETED', completed_date: updatePayload.completed_date },
    });

    return sendSuccess(res, updated, 'Installation marked as COMPLETED (Install Ho Gya) successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateInstallation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      scheduled_date,
      completed_date,
      assigned_technician,
      checklist,
      test_results,
      notes,
      address,
      system_capacity_kw,
    } = req.body;

    const dataToUpdate: any = {};
    if (status) {
      dataToUpdate.status = status;
      if (status === 'COMPLETED' && !completed_date) {
        dataToUpdate.completed_date = new Date();
      }
    }
    if (scheduled_date) dataToUpdate.scheduled_date = new Date(scheduled_date);
    if (completed_date !== undefined) {
      dataToUpdate.completed_date = completed_date ? new Date(completed_date) : null;
    }
    if (assigned_technician !== undefined) dataToUpdate.assigned_technician = assigned_technician;
    if (address !== undefined) dataToUpdate.address = address;
    if (system_capacity_kw !== undefined) dataToUpdate.system_capacity_kw = Number(system_capacity_kw);
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (checklist) dataToUpdate.checklist_json = typeof checklist === 'string' ? checklist : JSON.stringify(checklist);
    if (test_results)
      dataToUpdate.test_results_json = typeof test_results === 'string' ? test_results : JSON.stringify(test_results);

    const updated = await prisma.installation.update({
      where: { id },
      data: dataToUpdate,
      include: { customer: true, sale: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Installation',
      entityId: id,
      newData: dataToUpdate,
    });

    return sendSuccess(res, updated, 'Installation job updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteInstallation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.installation.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Installation job not found', 404);
    }

    await prisma.installation.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Installation',
      entityId: id,
      newData: { deleted: true, job_no: existing.job_no },
    });

    return sendSuccess(res, null, 'Installation job deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};
