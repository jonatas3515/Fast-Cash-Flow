import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function getCompanySegment(companyId: string): Promise<string | null> {
  try {
    const segmentFromRequests = async (opts: { approvedCompanyId?: string; approvedUsername?: string; companyName?: string }): Promise<string | null> => {
      const base: any = supabase.from('company_requests').select('segment');

      const applyApprovedFilter = (q: any) => q.eq('approved', true);
      const applyStatusApprovedFilter = (q: any) => q.eq('status', 'approved' as any);

      const runWithApprovalFallback = async (
        build: (q: any) => any
      ): Promise<{ data: any; error: any } | null> => {
        // Try approved=true first
        {
          const { data, error } = await build(applyApprovedFilter(base));
          if (!error) return { data, error };

          const msg = error?.message || '';
          if (/column\s+"approved"\s+of\s+relation\s+"company_requests"\s+does\s+not\s+exist/i.test(msg)) {
            // fallback to status='approved'
          } else {
            return { data, error };
          }
        }

        // Try status='approved'
        {
          const { data, error } = await build(applyStatusApprovedFilter(base));
          return { data, error };
        }
      };

      const tryQueries: Array<() => Promise<string | null>> = [];

      if (opts.approvedCompanyId) {
        tryQueries.push(async () => {
          const res = await runWithApprovalFallback((q) =>
            q
              .eq('approved_company_id', opts.approvedCompanyId)
              .not('segment', 'is', null)
              .limit(1)
              .maybeSingle()
          );

          const data = res?.data;
          const error = res?.error;

          if (error) {
            if (/column\s+"approved_company_id"\s+of\s+relation\s+"company_requests"\s+does\s+not\s+exist/i.test(error.message || '')) return null;
            if (/column\s+"segment"\s+of\s+relation\s+"company_requests"\s+does\s+not\s+exist/i.test(error.message || '')) return null;
            if (error.code === 'PGRST116') return null;
            if (error.code === '42P01' || error.message?.includes('permission denied')) return null;
            console.error('Erro ao buscar segmento (company_requests by company_id):', error);
            return null;
          }

          const seg = (data as any)?.segment as string | null | undefined;
          return seg && seg.trim() ? seg : null;
        });
      }

      if (opts.approvedUsername) {
        const approvedUsername = opts.approvedUsername.trim();
        if (approvedUsername) {
          tryQueries.push(async () => {
            const res = await runWithApprovalFallback((q) =>
              q
                .ilike('approved_username', approvedUsername)
                .not('segment', 'is', null)
                .limit(1)
                .maybeSingle()
            );

            const data = res?.data;
            const error = res?.error;

            if (error) {
              if (/column\s+"segment"\s+of\s+relation\s+"company_requests"\s+does\s+not\s+exist/i.test(error.message || '')) return null;
              if (error.code === 'PGRST116') return null;
              if (error.code === '42P01' || error.message?.includes('permission denied')) return null;
              console.error('Erro ao buscar segmento (company_requests by approved_username):', error);
              return null;
            }

            const seg = (data as any)?.segment as string | null | undefined;
            return seg && seg.trim() ? seg : null;
          });
        }
      }

      if (opts.companyName) {
        const companyName = opts.companyName.trim();
        if (companyName) {
          tryQueries.push(async () => {
            const res = await runWithApprovalFallback((q) =>
              q
                .ilike('company_name', companyName)
                .not('segment', 'is', null)
                .limit(1)
                .maybeSingle()
            );

            const data = res?.data;
            const error = res?.error;

            if (!error) {
              const seg = (data as any)?.segment as string | null | undefined;
              if (seg && seg.trim()) return seg;
            }

            const res2 = await runWithApprovalFallback((q) =>
              q
                .ilike('company_name', `%${companyName}%`)
                .not('segment', 'is', null)
                .limit(1)
                .maybeSingle()
            );

            const data2 = res2?.data;
            const error2 = res2?.error;

            if (error2) {
              if (/column\s+"segment"\s+of\s+relation\s+"company_requests"\s+does\s+not\s+exist/i.test(error2.message || '')) return null;
              if (error2.code === 'PGRST116') return null;
              if (error2.code === '42P01' || error2.message?.includes('permission denied')) return null;
              console.error('Erro ao buscar segmento (company_requests by company_name):', error2);
              return null;
            }

            const seg2 = (data2 as any)?.segment as string | null | undefined;
            return seg2 && seg2.trim() ? seg2 : null;
          });
        }
      }

      for (const run of tryQueries) {
        const seg = await run();
        if (seg) return seg;
      }

      return null;
    };

    const { data, error } = await supabase
      .from('companies')
      .select('segment, username, name')
      .eq('id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      let authName: string | null = null;
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') authName = window.localStorage.getItem('auth_name');
        else authName = await SecureStore.getItemAsync('auth_name');
      } catch { }
      if (error.code === '42P01' || error.message?.includes('permission denied')) {
        return await segmentFromRequests({ approvedCompanyId: companyId, companyName: authName ?? undefined });
      }
      console.error('Erro ao buscar segmento da empresa:', error);
      return await segmentFromRequests({ approvedCompanyId: companyId, companyName: authName ?? undefined });
    }

    const segment = (data as any)?.segment as string | null | undefined;
    if (segment && segment.trim()) return segment;

    const username = (data as any)?.username as string | null | undefined;
    const name = (data as any)?.name as string | null | undefined;

    return await segmentFromRequests({
      approvedCompanyId: companyId,
      approvedUsername: username ?? undefined,
      companyName: name ?? undefined,
    });
  } catch (err) {
    console.error('Exceção ao buscar segmento da empresa:', err);
    return null;
  }
}
