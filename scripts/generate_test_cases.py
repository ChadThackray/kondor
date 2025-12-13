#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "py-lets-be-rational @ git+https://github.com/vollib/py_lets_be_rational.git",
#     "py-vollib @ git+https://github.com/vollib/py_vollib.git",
# ]
# ///
"""
Generate Black-Scholes test cases using py_vollib as reference implementation.

Run with: uv run scripts/generate_test_cases.py
"""

import json
from pathlib import Path

from py_vollib.black_scholes import black_scholes
from py_vollib.black_scholes.greeks.analytical import delta, gamma, theta, vega, rho


def generate_test_cases() -> list[dict]:
    """Generate comprehensive test cases for Black-Scholes pricing."""
    test_cases = []

    # Test parameters
    spot_prices = [50.0, 100.0, 150.0, 200.0]
    strikes = [80.0, 100.0, 120.0]
    times_to_expiry = [7 / 365, 30 / 365, 90 / 365, 365 / 365]  # in years
    volatilities = [0.2, 0.5, 0.8, 1.0]
    risk_free_rate = 0.0  # Typical for crypto

    for S in spot_prices:
        for K in strikes:
            for T in times_to_expiry:
                for sigma in volatilities:
                    for option_type in ["c", "p"]:
                        is_call = option_type == "c"

                        # Calculate price and Greeks using py_vollib
                        try:
                            price = black_scholes(option_type, S, K, T, risk_free_rate, sigma)
                            delta_val = delta(option_type, S, K, T, risk_free_rate, sigma)
                            gamma_val = gamma(option_type, S, K, T, risk_free_rate, sigma)
                            theta_val = theta(option_type, S, K, T, risk_free_rate, sigma)
                            vega_val = vega(option_type, S, K, T, risk_free_rate, sigma)
                            rho_val = rho(option_type, S, K, T, risk_free_rate, sigma)

                            test_cases.append(
                                {
                                    "inputs": {
                                        "isCall": is_call,
                                        "S": S,
                                        "K": K,
                                        "T": T,
                                        "r": risk_free_rate,
                                        "sigma": sigma,
                                    },
                                    "expected": {
                                        "price": price,
                                        "delta": delta_val,
                                        "gamma": gamma_val,
                                        # py_vollib returns theta per day already
                                        "theta": theta_val,
                                        # py_vollib returns vega per 1% already
                                        "vega": vega_val,
                                        # py_vollib returns rho per 1% already
                                        "rho": rho_val,
                                    },
                                    "description": f"{'Call' if is_call else 'Put'} S={S} K={K} T={T:.4f}y σ={sigma}",
                                }
                            )
                        except Exception as e:
                            print(f"Skipping case due to error: {e}")
                            continue

    return test_cases


def main():
    test_cases = generate_test_cases()

    output_path = Path(__file__).parent.parent / "src/lib/utils/__tests__/blackscholes.fixtures.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(
            {
                "description": "Black-Scholes test cases generated using py_vollib",
                "generated_by": "scripts/generate_test_cases.py",
                "tolerance": 0.0001,
                "cases": test_cases,
            },
            f,
            indent=2,
        )

    print(f"Generated {len(test_cases)} test cases")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
