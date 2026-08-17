import { useCallback, useEffect, useState } from 'react';
import * as repo from '@/repositories/financialRepository';
import { subscribeData } from '@/lib/dataEvents';
import type { Expense, Investment, Loan, MonthlySettlement, Payment } from '@/types';

export { useEarnings } from './useEarnings';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setExpenses(await repo.getAllExpenses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load();
    const unsubscribe = subscribeData(() => {
      if (active) load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return { expenses, loading, reload: load };
}

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvestments(await repo.getAllInvestments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load();
    const unsubscribe = subscribeData(() => {
      if (active) load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return { investments, loading, reload: load };
}

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLoans(await repo.getAllLoans());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load();
    const unsubscribe = subscribeData(() => {
      if (active) load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return { loans, loading, reload: load };
}

export function useSettlements() {
  const [settlements, setSettlements] = useState<MonthlySettlement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettlements(await repo.getAllSettlements());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load();
    const unsubscribe = subscribeData(() => {
      if (active) load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return { settlements, loading, reload: load };
}

export function useSettlementDetail(settlementId: string | null) {
  const [settlement, setSettlement] = useState<MonthlySettlement | null>(null);
  const [allocations, setAllocations] = useState<Awaited<ReturnType<typeof repo.getAllocationsForSettlement>>>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!settlementId) return;
    setLoading(true);
    try {
      const [s, a, p] = await Promise.all([
        repo.getSettlementById(settlementId),
        repo.getAllocationsForSettlement(settlementId),
        repo.getPaymentsForSettlement(settlementId),
      ]);
      setSettlement(s);
      setAllocations(a);
      setPayments(p);
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => {
    let active = true;
    load();
    const unsubscribe = subscribeData(() => {
      if (active) load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return { settlement, allocations, payments, loading, reload: load };
}

export function useLoanDetail(loanId: string | null) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [repayments, setRepayments] = useState<Awaited<ReturnType<typeof repo.getRepaymentsForLoan>>>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const [l, r] = await Promise.all([repo.getLoanById(loanId), repo.getRepaymentsForLoan(loanId)]);
      setLoan(l);
      setRepayments(r);
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    let active = true;
    load();
    const unsubscribe = subscribeData(() => {
      if (active) load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return { loan, repayments, loading, reload: load };
}
