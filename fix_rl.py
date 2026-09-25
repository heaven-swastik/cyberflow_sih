with open('ai-engine/rl_correction_engine.py', 'r', encoding='utf-8') as f:
    c = f.read()

target = 'case_obj = enrich_case_with_atm_intelligence(case_id, case_obj, [], "investment_scam")'
replacement = 'case_obj = enrich_case_with_atm_intelligence(case_id, case_obj, [], "investment_scam", seed_override=case_id + "_corrected")'
c = c.replace(target, replacement)

with open('ai-engine/rl_correction_engine.py', 'w', encoding='utf-8') as f:
    f.write(c)
print('Updated rl_correction_engine.py')
