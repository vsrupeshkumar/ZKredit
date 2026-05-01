// ============================================================================
// Zkredit - Settlement Validator (Aiken)
// ============================================================================
// This validator holds the loan principal on the Cardano main chain.
// It represents the *final state* that comes out of the Hydra Head after
// off-chain negotiation is complete.
//
// The validator ensures that both parties (Borrower and Lender) have agreed
// to the final terms by requiring both signatures.
// ============================================================================

use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{ScriptContext, Spend}
use aiken/transaction/credential.{VerificationKey}

// ============================================================================
// Types
// ============================================================================

/// The final settlement terms agreed upon in the Hydra Head
type SettleLoan {
  /// The final interest rate (in basis points, e.g., 750 = 7.5%)
  final_interest_rate: Int,
}

/// Datum holds the loan metadata
type LoanDatum {
  /// Verification key hash of the borrower
  borrower: Hash<Blake2b_224, VerificationKey>,
  /// Verification key hash of the lender
  lender: Hash<Blake2b_224, VerificationKey>,
  /// Principal amount (in lovelace)
  principal: Int,
  /// Loan term in months
  term_months: Int,
}

// ============================================================================
// Validator Logic
// ============================================================================

/// Settlement validator for Zkredit loans
/// 
/// This validator ensures that:
/// 1. Both borrower and lender have signed the transaction
/// 2. The settlement contains a valid interest rate
/// 
/// The actual settlement logic (transferring principal + interest) is handled
/// by the transaction builder off-chain. This validator only ensures proper
/// authorization from both parties.
validator {
  fn settle(
    datum: LoanDatum,
    redeemer: SettleLoan,
    context: ScriptContext,
  ) -> Bool {
    // Extract transaction info
    let ScriptContext { transaction, purpose } = context
    
    // Ensure we're spending from this script
    expect Spend(_) = purpose
    
    // Validation Rule 1: Interest rate must be reasonable (0-100%)
    let interest_rate_valid = 
      redeemer.final_interest_rate >= 0 && redeemer.final_interest_rate <= 10000
    
    // Validation Rule 2: Transaction must be signed by the borrower
    let signed_by_borrower = 
      list.has(transaction.extra_signatories, datum.borrower)
    
    // Validation Rule 3: Transaction must be signed by the lender
    let signed_by_lender = 
      list.has(transaction.extra_signatories, datum.lender)
    
    // All conditions must be satisfied
    interest_rate_valid && signed_by_borrower && signed_by_lender
  }
}

// ============================================================================
// Tests
// ============================================================================

test settle_with_valid_signatures() {
  let datum = LoanDatum {
    borrower: #"aabbccdd",
    lender: #"eeff0011",
    principal: 1_000_000_000,  // 1000 ADA in lovelace
    term_months: 12,
  }
  
  let redeemer = SettleLoan {
    final_interest_rate: 750,  // 7.5%
  }
  
  // Mock context with both signatures
  let context = ScriptContext {
    transaction: transaction.placeholder()
      |> fn(tx) {
           transaction.Transaction { 
             ..tx, 
             extra_signatories: [#"aabbccdd", #"eeff0011"] 
           }
         },
    purpose: Spend(transaction.OutputReference {
      transaction_id: transaction.TransactionId { hash: #"" },
      output_index: 0,
    }),
  }
  
  settle(datum, redeemer, context)
}

test settle_fails_without_borrower_signature() {
  let datum = LoanDatum {
    borrower: #"aabbccdd",
    lender: #"eeff0011",
    principal: 1_000_000_000,
    term_months: 12,
  }
  
  let redeemer = SettleLoan {
    final_interest_rate: 750,
  }
  
  // Mock context with only lender signature
  let context = ScriptContext {
    transaction: transaction.placeholder()
      |> fn(tx) {
           transaction.Transaction { 
             ..tx, 
             extra_signatories: [#"eeff0011"]  // Missing borrower
           }
         },
    purpose: Spend(transaction.OutputReference {
      transaction_id: transaction.TransactionId { hash: #"" },
      output_index: 0,
    }),
  }
  
  !settle(datum, redeemer, context)  // Should fail
}

test settle_fails_with_invalid_interest_rate() {
  let datum = LoanDatum {
    borrower: #"aabbccdd",
    lender: #"eeff0011",
    principal: 1_000_000_000,
    term_months: 12,
  }
  
  let redeemer = SettleLoan {
    final_interest_rate: 15000,  // 150% - unreasonable!
  }
  
  let context = ScriptContext {
    transaction: transaction.placeholder()
      |> fn(tx) {
           transaction.Transaction { 
             ..tx, 
             extra_signatories: [#"aabbccdd", #"eeff0011"] 
           }
         },
    purpose: Spend(transaction.OutputReference {
      transaction_id: transaction.TransactionId { hash: #"" },
      output_index: 0,
    }),
  }
  
  !settle(datum, redeemer, context)  // Should fail
}
