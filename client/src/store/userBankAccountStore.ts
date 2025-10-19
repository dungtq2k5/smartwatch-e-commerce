import { create } from "zustand";
import type {
  UserBankAccountSetupResponse,
  UserSelfBankAccountListResponse,
  UserSelfBankAccountResponse,
} from "../../../common/types.common";
import { formatError } from "../../../common/utils.common";
import { patch, post, remove, retrieve } from "../utils/utils";
import { SELF_BANK_ACCOUNTS_URL } from "../configs";

type UserBankAccountState = {
  bankAccounts: UserSelfBankAccountListResponse | null;

  clearCache: () => void;

  fetchBankAccounts: (
    oblige?: boolean
  ) => Promise<UserSelfBankAccountListResponse>;
  setupBankAccount: () => Promise<UserBankAccountSetupResponse>; // If there is unverified bank account, this function will redirect to verify page instead of creating new one
  refreshOnboardingUrl: (
    bankAccountId: string
  ) => Promise<UserBankAccountSetupResponse>;
  setDefaultBankAccount: (id: string) => Promise<UserSelfBankAccountResponse>;
  deleteBankAccount: (id: string) => Promise<void>;
};

export const useUserBankAccountStore = create<UserBankAccountState>(
  (set, get) => ({
    bankAccounts: null,

    clearCache(): void {
      set({ bankAccounts: null });
    },

    async fetchBankAccounts(
      oblige?: boolean
    ): Promise<UserSelfBankAccountListResponse> {
      if (!oblige) {
        const { bankAccounts } = get();
        if (bankAccounts) return bankAccounts;
      }

      try {
        const res = await retrieve(SELF_BANK_ACCOUNTS_URL);
        if (!res.success) throw new Error(res.message);

        const bankAccounts = res.data as UserSelfBankAccountListResponse;
        set({ bankAccounts });
        return bankAccounts;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async setupBankAccount(): Promise<UserBankAccountSetupResponse> {
      try {
        const res = await post(`${SELF_BANK_ACCOUNTS_URL}/setup-intent`);
        if (!res.success) throw new Error(res.message);

        return res.data as UserBankAccountSetupResponse;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async refreshOnboardingUrl(
      bankAccountId: string
    ): Promise<UserBankAccountSetupResponse> {
      try {
        const res = await post(
          `${SELF_BANK_ACCOUNTS_URL}/${bankAccountId}/refresh-onboarding`
        );
        if (!res.success) throw new Error(res.message);

        return res.data as UserBankAccountSetupResponse;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async setDefaultBankAccount(
      id: string
    ): Promise<UserSelfBankAccountResponse> {
      try {
        const res = await patch(`${SELF_BANK_ACCOUNTS_URL}/${id}/set-default`);
        if (!res.success) throw new Error(res.message);

        const updatedBankAccount = res.data as UserSelfBankAccountResponse;
        const { bankAccounts } = get();
        if (bankAccounts) {
          const updatedAccounts = bankAccounts.accounts.map((account) => {
            if (account.id === id) return updatedBankAccount;
            if (account.isDefault) return { ...account, isDefault: false };
            return account;
          });
          set({
            bankAccounts: {
              ...bankAccounts,
              total: updatedAccounts.length,
              accounts: updatedAccounts,
            },
          });
        }
        return updatedBankAccount;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async deleteBankAccount(id: string): Promise<void> {
      try {
        const res = await remove(`${SELF_BANK_ACCOUNTS_URL}/${id}`);
        if (!res.success) throw new Error(res.message);

        const { bankAccounts } = get();
        if (bankAccounts) {
          const updatedAccounts = bankAccounts.accounts;
          const accountIdxToRemove = updatedAccounts.findIndex(
            (account) => account.id === id
          );

          if (accountIdxToRemove !== -1) {
            if (
              updatedAccounts.length > 1 &&
              updatedAccounts[accountIdxToRemove].isDefault
            ) {
              await get().fetchBankAccounts(true);
              return;
            }
            updatedAccounts.splice(accountIdxToRemove, 1);
            set({
              bankAccounts: {
                ...bankAccounts,
                total: updatedAccounts.length,
                accounts: updatedAccounts,
              },
            });
          }
        }
      } catch (error) {
        throw new Error(formatError(error));
      }
    },
  })
);
