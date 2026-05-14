#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const script = path.join(root, 'desktop', 'bin', 'refresh_once.py');
const python = process.env.PYTHON || 'python';

function fail(message, details) {
  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function runDry(args) {
  const result = spawnSync(python, [script, ...args, '--dry-run'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  if (result.error) throw result.error;
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  assert(result.status === 0, 'dry-run refresh en erreur', { args, status: result.status, output });
  const stages = output
    .split(/\r?\n/)
    .map((line) => line.match(/^\[dry-run\]\s+\d+\.\s+([^\s]+)/))
    .filter(Boolean)
    .map((match) => match[1]);
  assert(stages.length > 0, 'aucune étape dry-run détectée', { args, output });
  return { output, stages };
}

function indexOf(stages, name) {
  return stages.indexOf(name);
}

function assertIncludes(stages, name, label) {
  assert(stages.includes(name), `${label} absent`, { stages });
}

function assertBefore(stages, first, second, label) {
  const a = indexOf(stages, first);
  const b = indexOf(stages, second);
  assert(a >= 0 && b >= 0 && a < b, `${label} ordre invalide`, { first, second, stages });
}

function assertDecisionOutputs(stages, label) {
  assertIncludes(stages, 'build_team_identity_graph.py', `${label} identity graph`);
  assertIncludes(stages, 'build_signal_conflict_backtest.py', `${label} backtest conflit signaux`);
  assertIncludes(stages, 'build_agent_bankroll_simulation.py', `${label} simulation bankroll agent`);
  assertIncludes(stages, 'build_match_decision_timeline.py', `${label} timeline décision`);
  assertIncludes(stages, 'build_smart_prepare_plan.py', `${label} plan préparation intelligent`);
  assertIncludes(stages, 'build_decision_exports.py', `${label} exports décision`);
  assertIncludes(stages, 'build_source_registry.py', `${label} registre sources`);
  assertIncludes(stages, 'build_optional_sources_plan.py', `${label} sources optionnelles`);
  assertIncludes(stages, 'build_v4_audit_reports.py', `${label} audits critiques V4`);
  assertIncludes(stages, 'build_v5_fix_campaign.py', `${label} campagne correction V5`);
  assertIncludes(stages, 'build_v6_decision_terminal.py', `${label} terminal décision V6`);
  assertIncludes(stages, 'build_v7_actionability.py', `${label} actionnabilité V7`);
  assertIncludes(stages, 'build_v8_decision_cockpit.py', `${label} cockpit décision V8`);
  assertIncludes(stages, 'build_v9_operational_readiness.py', `${label} readiness V9`);
  assertIncludes(stages, 'build_v10_finalizer.py', `${label} finalizer V10`);
  assertIncludes(stages, 'build_v11_finalizer.py', `${label} finalizer V11`);
  assertIncludes(stages, 'build_v12_price_watch.py', `${label} price watch V12`);
  assertIncludes(stages, 'build_v13_price_alerts.py', `${label} alertes prix V13`);
  assertIncludes(stages, 'build_v14_quality_audit.py', `${label} audit qualité V14`);
  assertIncludes(stages, 'build_v15_operational_cleanup.py', `${label} cockpit action V15`);
  assertIncludes(stages, 'build_v16_final_decision.py', `${label} ticket final V16`);
  assertBefore(stages, 'build_match_context.py', 'build_team_identity_graph.py', `${label} contexte avant identity graph`);
  assertBefore(stages, 'build_decision_tuning.py', 'build_signal_conflict_backtest.py', `${label} tuning avant conflit`);
  if (stages.includes('build_decision_shadow.py')) {
    assertBefore(stages, 'build_signal_conflict_backtest.py', 'build_decision_shadow.py', `${label} conflit avant shadow`);
  }
  assertBefore(stages, 'build_signal_conflict_backtest.py', 'build_health.py', `${label} conflit avant santé`);
  assertBefore(stages, 'build_prebet_checklist_backtest.py', 'build_agent_bankroll_simulation.py', `${label} checklist backtest avant simulation agent`);
  assertBefore(stages, 'build_agent_bankroll_simulation.py', 'build_match_decision_timeline.py', `${label} simulation avant timeline`);
  assertBefore(stages, 'build_match_decision_timeline.py', 'build_smart_prepare_plan.py', `${label} timeline avant préparation intelligente`);
  assertBefore(stages, 'build_prebet_checklist_backtest.py', 'build_v4_audit_reports.py', `${label} backtest checklist avant audits V4`);
  assertBefore(stages, 'build_source_registry.py', 'build_optional_sources_plan.py', `${label} registre avant sources optionnelles`);
  assertBefore(stages, 'build_optional_sources_plan.py', 'build_v4_audit_reports.py', `${label} sources optionnelles avant audits V4`);
  assertBefore(stages, 'build_v4_audit_reports.py', 'build_v5_fix_campaign.py', `${label} audits V4 avant V5`);
  assertBefore(stages, 'build_v5_fix_campaign.py', 'build_v6_decision_terminal.py', `${label} V5 avant V6`);
  assertBefore(stages, 'build_v6_decision_terminal.py', 'build_v7_actionability.py', `${label} V6 avant V7`);
  assertBefore(stages, 'build_v7_actionability.py', 'build_v8_decision_cockpit.py', `${label} V7 avant V8`);
  assertBefore(stages, 'build_v8_decision_cockpit.py', 'build_v9_operational_readiness.py', `${label} V8 avant V9`);
  assertBefore(stages, 'build_v9_operational_readiness.py', 'build_v10_finalizer.py', `${label} V9 avant V10`);
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', `${label} V10 avant V11`);
  assertBefore(stages, 'build_v11_finalizer.py', 'build_v12_price_watch.py', `${label} V11 avant V12`);
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', `${label} V12 avant V13`);
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_v14_quality_audit.py', `${label} V13 avant V14`);
  assertBefore(stages, 'build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', `${label} V14 avant V15`);
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', `${label} V15 avant V16`);
  assertBefore(stages, 'build_v16_final_decision.py', 'build_decision_exports.py', `${label} V16 avant exports`);
  assertBefore(stages, 'build_optional_sources_plan.py', 'build_health.py', `${label} sources optionnelles avant santé`);
  assertBefore(stages, 'build_source_registry.py', 'build_health.py', `${label} registre avant santé`);
  assertBefore(stages, 'build_v4_audit_reports.py', 'build_health.py', `${label} audits V4 avant santé`);
  assertBefore(stages, 'build_v5_fix_campaign.py', 'build_health.py', `${label} campagne V5 avant santé`);
  assertBefore(stages, 'build_v6_decision_terminal.py', 'build_health.py', `${label} terminal V6 avant santé`);
  assertBefore(stages, 'build_v7_actionability.py', 'build_health.py', `${label} actionnabilité V7 avant santé`);
  assertBefore(stages, 'build_v8_decision_cockpit.py', 'build_health.py', `${label} cockpit V8 avant santé`);
  assertBefore(stages, 'build_v9_operational_readiness.py', 'build_health.py', `${label} readiness V9 avant santé`);
  assertBefore(stages, 'build_v10_finalizer.py', 'build_health.py', `${label} finalizer V10 avant santé`);
  assertBefore(stages, 'build_v11_finalizer.py', 'build_health.py', `${label} finalizer V11 avant santé`);
  assertBefore(stages, 'build_v12_price_watch.py', 'build_health.py', `${label} price watch V12 avant santé`);
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_health.py', `${label} alertes V13 avant santé`);
  assertBefore(stages, 'build_v14_quality_audit.py', 'build_health.py', `${label} audit V14 avant santé`);
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_health.py', `${label} V15 avant santé`);
  assertBefore(stages, 'build_v16_final_decision.py', 'build_health.py', `${label} V16 avant santé`);
}

function testQuick() {
  const { stages } = runDry(['--quick']);
  assertIncludes(stages, 'fetch_live.py', 'quick fetch_live');
  assertIncludes(stages, 'fetch_winamax_catalog.py', 'quick Winamax catalog');
  assertIncludes(stages, 'build_xg_coverage.py', 'quick xG coverage');
  assertIncludes(stages, 'build_team_priors.py', 'quick team priors');
  assertIncludes(stages, 'build_match_context.py', 'quick dossier contexte');
  assertIncludes(stages, 'build_decision_backtest.py', 'quick backtest décision');
  assertIncludes(stages, 'compute_clv.py', 'quick CLV');
  assertIncludes(stages, 'build_decision_tuning.py', 'quick tuning décision');
  assertIncludes(stages, 'build_decision_shadow.py', 'quick shadow décision');
  assertIncludes(stages, 'build_odds_guardrails.py', 'quick garde-fous cotes');
  assertIncludes(stages, 'build_agent_blocker_backtest.py', 'quick backtest blocages agent');
  assertIncludes(stages, 'build_agent_guardrail_recommendations.py', 'quick conseils garde-fous agent');
  assertIncludes(stages, 'build_stake_reduction_backtest.py', 'quick backtest réduction de mise');
  assertIncludes(stages, 'build_scorer_quality.py', 'quick qualité buteurs');
  assertIncludes(stages, 'archive_scorer_candidates.py', 'quick archive buteurs');
  assertIncludes(stages, 'settle_scorer_candidates.py', 'quick settlement buteurs');
  assertIncludes(stages, 'build_scorer_pending_audit.py', 'quick audit pending buteurs');
  assertIncludes(stages, 'build_prematch_focus.py', 'quick focus pré-match');
  assertIncludes(stages, 'build_prematch_execution_plan.py', 'quick plan pré-match');
  assertIncludes(stages, 'build_signal_coverage_trend.py', 'quick tendance couverture');
  assertIncludes(stages, 'build_next_actions.py', 'quick prochaines actions');
  assertIncludes(stages, 'build_source_freshness_plan.py', 'quick plan fraîcheur sources');
  assertIncludes(stages, 'build_context_repair_plan.py', 'quick plan réparation contexte');
  assertIncludes(stages, 'build_refresh_priority_plan.py', 'quick file refresh prioritaire');
  assertIncludes(stages, 'build_prebet_checklist.py', 'quick checklist avant mise');
  assertIncludes(stages, 'build_prebet_checklist_backtest.py', 'quick backtest checklist');
  assertIncludes(stages, 'finalize_inline.py', 'quick finalize');
  assertDecisionOutputs(stages, 'quick');
  assertBefore(stages, 'fetch_live.py', 'patch_all_quick.py', 'quick fetch avant patch');
  assertBefore(stages, 'patch_all_quick.py', 'finalize_inline.py', 'quick patch avant finalize');
  assertBefore(stages, 'build_xg_coverage.py', 'build_health.py', 'quick rapports avant santé');
  assertBefore(stages, 'build_team_priors.py', 'build_match_context.py', 'quick priors avant contexte');
  assertBefore(stages, 'build_match_context.py', 'build_health.py', 'quick contexte avant santé');
  assertBefore(stages, 'settle_picks.py', 'build_context_backtest.py', 'quick settlement avant backtest contexte');
  assertBefore(stages, 'build_context_backtest.py', 'build_decision_backtest.py', 'quick backtest contexte avant décision');
  assertBefore(stages, 'build_decision_backtest.py', 'build_decision_tuning.py', 'quick décision avant tuning');
  assertBefore(stages, 'build_decision_tuning.py', 'build_decision_shadow.py', 'quick tuning avant shadow');
  assertBefore(stages, 'build_decision_shadow.py', 'build_health.py', 'quick shadow avant santé');
  assertBefore(stages, 'build_odds_guardrails.py', 'build_health.py', 'quick garde-fous cotes avant santé');
  assertBefore(stages, 'build_agent_blocker_backtest.py', 'build_health.py', 'quick backtest blocages agent avant santé');
  assertBefore(stages, 'build_agent_blocker_backtest.py', 'build_agent_guardrail_recommendations.py', 'quick backtest agent avant conseils');
  assertBefore(stages, 'build_agent_guardrail_recommendations.py', 'build_health.py', 'quick conseils garde-fous avant santé');
  assertBefore(stages, 'build_agent_guardrail_recommendations.py', 'build_stake_reduction_backtest.py', 'quick conseils avant réduction de mise');
  assertBefore(stages, 'build_stake_reduction_backtest.py', 'build_health.py', 'quick réduction de mise avant santé');
  assertBefore(stages, 'compute_clv.py', 'build_health.py', 'quick CLV avant santé');
  assertBefore(stages, 'build_decision_backtest.py', 'build_health.py', 'quick backtest décision avant santé');
  assertBefore(stages, 'build_scorer_quality.py', 'build_health.py', 'quick qualité buteurs avant santé');
  assertBefore(stages, 'archive_scorer_candidates.py', 'build_health.py', 'quick archive buteurs avant santé');
  assertBefore(stages, 'archive_scorer_candidates.py', 'settle_scorer_candidates.py', 'quick archive avant settlement buteurs');
  assertBefore(stages, 'settle_scorer_candidates.py', 'build_health.py', 'quick settlement buteurs avant santé');
  assertBefore(stages, 'settle_scorer_candidates.py', 'build_scorer_pending_audit.py', 'quick settlement avant audit pending');
  assertBefore(stages, 'build_scorer_pending_audit.py', 'build_health.py', 'quick audit pending avant santé');
  assertBefore(stages, 'build_prematch_focus.py', 'build_health.py', 'quick focus pré-match avant santé');
  assertBefore(stages, 'build_prematch_focus.py', 'build_prematch_execution_plan.py', 'quick focus avant plan pré-match');
  assertBefore(stages, 'build_signal_coverage_trend.py', 'build_health.py', 'quick tendance couverture avant santé');
  assertBefore(stages, 'build_next_actions.py', 'build_health.py', 'quick prochaines actions avant santé');
  assertBefore(stages, 'build_source_freshness_plan.py', 'build_health.py', 'quick plan fraîcheur avant santé');
  assertBefore(stages, 'build_source_freshness_plan.py', 'build_context_repair_plan.py', 'quick plan fraîcheur avant réparation contexte');
  assertBefore(stages, 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'quick réparation contexte avant file refresh');
  assertBefore(stages, 'build_context_repair_plan.py', 'build_health.py', 'quick réparation contexte avant santé');
  assertBefore(stages, 'build_source_freshness_plan.py', 'build_refresh_priority_plan.py', 'quick plan fraîcheur avant file refresh');
  assertBefore(stages, 'build_refresh_priority_plan.py', 'build_health.py', 'quick file refresh avant santé');
  assertBefore(stages, 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'quick file avant checklist');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_health.py', 'quick checklist avant santé');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_prebet_checklist_backtest.py', 'quick checklist avant backtest checklist');
  assertBefore(stages, 'build_prebet_checklist_backtest.py', 'build_health.py', 'quick backtest checklist avant santé');
  assert(!stages.includes('fetch_v3.py'), 'quick ne doit pas lancer fetch_v3', { stages });
}

function testFull() {
  const { stages, output } = runDry(['--full']);
  assert(output.includes('dry-run:'), 'résumé dry-run full absent', { output });
  for (const stage of ['fetch_v3.py', 'fetch_clubelo.py', 'fetch_understat_xg.py', 'fetch_team_stats.py', 'fetch_live.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `full ${stage}`);
  }
  assertBefore(stages, 'fetch_v3.py', 'fetch_live.py', 'full extra avant quick');
  assertBefore(stages, 'fetch_understat_xg.py', 'fetch_team_stats.py', 'full xG avant team stats');
  assertBefore(stages, 'fetch_winamax_catalog.py', 'patch_winamax.py', 'full Winamax avant patch');
  assertDecisionOutputs(stages, 'full');
}

function testPrematch() {
  const { stages } = runDry(['--prematch']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'build_match_context.py', 'build_context_backtest.py', 'build_decision_backtest.py', 'compute_clv.py', 'build_decision_tuning.py', 'build_decision_shadow.py', 'build_odds_guardrails.py', 'build_agent_blocker_backtest.py', 'build_agent_guardrail_recommendations.py', 'build_stake_reduction_backtest.py', 'build_scorer_quality.py', 'archive_scorer_candidates.py', 'settle_scorer_candidates.py', 'build_scorer_pending_audit.py', 'build_prematch_focus.py', 'build_prematch_execution_plan.py', 'build_signal_coverage_trend.py', 'build_next_actions.py', 'build_source_freshness_plan.py', 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'build_prebet_checklist_backtest.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `prematch ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'prematch ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'prematch ne doit pas lancer team_stats lourd', { stages });
  assertDecisionOutputs(stages, 'prematch');
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'prematch détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'prematch lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_health.py', 'prematch contexte avant santé');
  assertBefore(stages, 'settle_picks.py', 'build_context_backtest.py', 'prematch settlement avant backtest contexte');
  assertBefore(stages, 'build_context_backtest.py', 'build_decision_backtest.py', 'prematch backtest contexte avant décision');
  assertBefore(stages, 'build_decision_backtest.py', 'build_decision_tuning.py', 'prematch décision avant tuning');
  assertBefore(stages, 'build_decision_tuning.py', 'build_decision_shadow.py', 'prematch tuning avant shadow');
  assertBefore(stages, 'build_decision_shadow.py', 'build_health.py', 'prematch shadow avant santé');
  assertBefore(stages, 'build_odds_guardrails.py', 'build_health.py', 'prematch garde-fous cotes avant santé');
  assertBefore(stages, 'build_agent_blocker_backtest.py', 'build_health.py', 'prematch backtest blocages agent avant santé');
  assertBefore(stages, 'build_agent_guardrail_recommendations.py', 'build_health.py', 'prematch conseils garde-fous avant santé');
  assertBefore(stages, 'build_stake_reduction_backtest.py', 'build_health.py', 'prematch réduction de mise avant santé');
  assertBefore(stages, 'compute_clv.py', 'build_health.py', 'prematch CLV avant santé');
  assertBefore(stages, 'build_decision_backtest.py', 'build_health.py', 'prematch backtest décision avant santé');
  assertBefore(stages, 'build_scorer_quality.py', 'build_health.py', 'prematch qualité buteurs avant santé');
  assertBefore(stages, 'archive_scorer_candidates.py', 'build_health.py', 'prematch archive buteurs avant santé');
  assertBefore(stages, 'settle_scorer_candidates.py', 'build_health.py', 'prematch settlement buteurs avant santé');
  assertBefore(stages, 'build_scorer_pending_audit.py', 'build_health.py', 'prematch audit pending avant santé');
  assertBefore(stages, 'build_prematch_focus.py', 'build_health.py', 'prematch focus avant santé');
  assertBefore(stages, 'build_prematch_execution_plan.py', 'build_health.py', 'prematch plan avant santé');
  assertBefore(stages, 'build_signal_coverage_trend.py', 'build_health.py', 'prematch tendance couverture avant santé');
  assertBefore(stages, 'build_next_actions.py', 'build_health.py', 'prematch prochaines actions avant santé');
  assertBefore(stages, 'build_source_freshness_plan.py', 'build_health.py', 'prematch plan fraîcheur avant santé');
  assertBefore(stages, 'build_context_repair_plan.py', 'build_health.py', 'prematch réparation contexte avant santé');
  assertBefore(stages, 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'prematch réparation avant file refresh');
  assertBefore(stages, 'build_refresh_priority_plan.py', 'build_health.py', 'prematch file refresh avant santé');
  assertBefore(stages, 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'prematch file avant checklist');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_health.py', 'prematch checklist avant santé');
  assertBefore(stages, 'build_prebet_checklist_backtest.py', 'build_health.py', 'prematch backtest checklist avant santé');
}

function testPrematchT60() {
  const { stages } = runDry(['--prematch-t60']);
  for (const stage of ['fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'patch_all_quick.py', 'build_match_context.py', 'build_prematch_execution_plan.py', 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'build_decision_exports.py', 'build_source_registry.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `prematch T-60 ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'prematch T-60 ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_winamax_match_details.py'), 'prematch T-60 ne doit pas relancer les détails cotes', { stages });
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'prematch T-60 lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_prematch_execution_plan.py', 'prematch T-60 contexte avant plan');
  assertBefore(stages, 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'prematch T-60 réparation avant file');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_health.py', 'prematch T-60 checklist avant santé');
  assertDecisionOutputs(stages, 'prematch T-60');
}

function testPrematchT30() {
  const { stages } = runDry(['--prematch-t30']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'build_decision_shadow.py', 'build_odds_guardrails.py', 'build_prematch_execution_plan.py', 'build_prebet_checklist.py', 'build_decision_exports.py', 'build_source_registry.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `prematch T-30 ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'prematch T-30 ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'prematch T-30 ne doit pas lancer team_stats lourd', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'prematch T-30 détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'prematch T-30 lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_prematch_execution_plan.py', 'prematch T-30 contexte avant plan');
  assertBefore(stages, 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'prematch T-30 file avant checklist');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_health.py', 'prematch T-30 checklist avant santé');
  assertDecisionOutputs(stages, 'prematch T-30');
}

function testPrematchT10() {
  const { stages } = runDry(['--prematch-t10']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'compute_clv.py', 'build_signal_conflict_backtest.py', 'build_odds_guardrails.py', 'build_stake_reduction_backtest.py', 'build_prematch_execution_plan.py', 'build_prebet_checklist.py', 'build_v6_decision_terminal.py', 'build_decision_exports.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `prematch T-10 ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'prematch T-10 ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'prematch T-10 ne doit pas lancer team_stats lourd', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'prematch T-10 détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'prematch T-10 lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_prematch_execution_plan.py', 'prematch T-10 contexte avant plan');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_v6_decision_terminal.py', 'prematch T-10 checklist avant V6');
  assertBefore(stages, 'build_v6_decision_terminal.py', 'build_v7_actionability.py', 'prematch T-10 V6 avant V7');
  assertBefore(stages, 'build_v7_actionability.py', 'build_decision_exports.py', 'prematch T-10 V7 avant exports');
  assertDecisionOutputs(stages, 'prematch T-10');
}

function testV7Finalize() {
  const { stages } = runDry(['--v7-finalize']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_referees_soccer.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'fetch_understat_xg.py', 'fetch_team_stats.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v6_decision_terminal.py', 'build_v7_actionability.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v7-finalize ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v7-finalize ne doit pas lancer fetch_v3', { stages });
  assertBefore(stages, 'fetch_team_stats.py', 'patch_all_quick.py', 'v7-finalize stats avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_v6_decision_terminal.py', 'v7-finalize contexte avant V6');
  assertBefore(stages, 'build_v6_decision_terminal.py', 'build_v7_actionability.py', 'v7-finalize V6 avant V7');
  assertBefore(stages, 'build_v7_actionability.py', 'build_decision_exports.py', 'v7-finalize V7 avant exports');
  assertDecisionOutputs(stages, 'v7-finalize');
}

function testV8PrepareNow() {
  const { stages } = runDry(['--v8-prepare-now']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v7_actionability.py', 'build_v8_decision_cockpit.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v8-prepare-now ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v8-prepare-now ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v8-prepare-now ne doit pas lancer team_stats lourd', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'v8-prepare-now détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v8-prepare-now lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_v6_decision_terminal.py', 'v8-prepare-now contexte avant V6');
  assertBefore(stages, 'build_v6_decision_terminal.py', 'build_v7_actionability.py', 'v8-prepare-now V6 avant V7');
  assertBefore(stages, 'build_v7_actionability.py', 'build_v8_decision_cockpit.py', 'v8-prepare-now V7 avant V8');
  assertBefore(stages, 'build_v8_decision_cockpit.py', 'build_v9_operational_readiness.py', 'v8-prepare-now V8 avant V9');
  assertBefore(stages, 'build_v9_operational_readiness.py', 'build_v10_finalizer.py', 'v8-prepare-now V9 avant V10');
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'v8-prepare-now V10 avant V11');
  assertBefore(stages, 'build_v11_finalizer.py', 'build_decision_exports.py', 'v8-prepare-now V11 avant exports');
  assertDecisionOutputs(stages, 'v8-prepare-now');
}

function testV9FinalizeNow() {
  const { stages } = runDry(['--v9-finalize-now']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_referees_soccer.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'fetch_team_form.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v7_actionability.py', 'build_v8_decision_cockpit.py', 'build_v9_operational_readiness.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v9-finalize-now ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v9-finalize-now ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v9-finalize-now ne doit pas lancer team_stats lourd', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'v9-finalize-now détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v9-finalize-now lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_v6_decision_terminal.py', 'v9-finalize-now contexte avant V6');
  assertBefore(stages, 'build_v6_decision_terminal.py', 'build_v7_actionability.py', 'v9-finalize-now V6 avant V7');
  assertBefore(stages, 'build_v7_actionability.py', 'build_v8_decision_cockpit.py', 'v9-finalize-now V7 avant V8');
  assertBefore(stages, 'build_v8_decision_cockpit.py', 'build_v9_operational_readiness.py', 'v9-finalize-now V8 avant V9');
  assertBefore(stages, 'build_v9_operational_readiness.py', 'build_v10_finalizer.py', 'v9-finalize-now V9 avant V10');
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'v9-finalize-now V10 avant V11');
  assertBefore(stages, 'build_v11_finalizer.py', 'build_decision_exports.py', 'v9-finalize-now V11 avant exports');
  assertDecisionOutputs(stages, 'v9-finalize-now');
}

function testV10Finalize() {
  const { stages } = runDry(['--v10-finalize']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_referees_soccer.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'fetch_team_form.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v7_actionability.py', 'build_v8_decision_cockpit.py', 'build_v9_operational_readiness.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v10-finalize ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v10-finalize ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v10-finalize ne doit pas lancer team_stats lourd', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'v10-finalize détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v10-finalize lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_v6_decision_terminal.py', 'v10-finalize contexte avant V6');
  assertBefore(stages, 'build_v7_actionability.py', 'build_v8_decision_cockpit.py', 'v10-finalize V7 avant V8');
  assertBefore(stages, 'build_v8_decision_cockpit.py', 'build_v9_operational_readiness.py', 'v10-finalize V8 avant V9');
  assertBefore(stages, 'build_v9_operational_readiness.py', 'build_v10_finalizer.py', 'v10-finalize V9 avant V10');
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'v10-finalize V10 avant V11');
  assertBefore(stages, 'build_v11_finalizer.py', 'build_decision_exports.py', 'v10-finalize V11 avant exports');
  assertDecisionOutputs(stages, 'v10-finalize');
}

function testV11T10Fast() {
  const { stages } = runDry(['--v11-t10-fast']);
  for (const stage of ['fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v11-t10-fast ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v11-t10-fast ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v11-t10-fast ne doit pas lancer team_stats lourd', { stages });
  assert(!stages.includes('fetch_h2h.py'), 'v11-t10-fast reste court et ne relance pas H2H', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'v11-t10-fast détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v11-t10-fast lineups avant patch');
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'v11-t10-fast V10 avant V11');
  assertDecisionOutputs(stages, 'v11-t10-fast');
}

function testV11Finalize() {
  const { stages } = runDry(['--v11-finalize']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_decision_exports.py']) {
    assertIncludes(stages, stage, `v11-finalize ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v11-finalize ne doit pas lancer fetch_v3', { stages });
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'v11-finalize V10 avant V11');
  assertDecisionOutputs(stages, 'v11-finalize');
}

function testV11RepairNow() {
  const { stages } = runDry(['--v11-repair-now']);
  for (const stage of ['fetch_weather.py', 'fetch_referees_soccer.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'fetch_team_form.py', 'fetch_understat_xg.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py']) {
    assertIncludes(stages, stage, `v11-repair-now ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v11-repair-now ne doit pas lancer fetch_v3', { stages });
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v11-repair-now lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_v10_finalizer.py', 'v11-repair-now contexte avant V10');
  assertDecisionOutputs(stages, 'v11-repair-now');
}

function testV12PriceWatch() {
  const { stages } = runDry(['--v12-price-watch']);
  for (const stage of ['fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'patch_winamax_markets.py', 'snapshot_odds.py', 'compute_clv.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v12-price-watch ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v12-price-watch ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v12-price-watch ne doit pas lancer team_stats lourd', { stages });
  assert(!stages.includes('fetch_lineups_soccer.py'), 'v12-price-watch reste prix et ne relance pas lineups', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'v12-price-watch détails avant snapshot');
  assertBefore(stages, 'snapshot_odds.py', 'compute_clv.py', 'v12-price-watch snapshot avant CLV');
  assertBefore(stages, 'compute_clv.py', 'build_v10_finalizer.py', 'v12-price-watch CLV avant V10');
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'v12-price-watch V10 avant V11');
  assertBefore(stages, 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'v12-price-watch V11 avant V12');
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'v12-price-watch V12 avant V13');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_decision_exports.py', 'v12-price-watch V13 avant exports');
}

function testV12Finalize() {
  const { stages } = runDry(['--v12-finalize']);
  for (const stage of ['fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v12-finalize ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v12-finalize ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v12-finalize garde le T-10 court', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'v12-finalize détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v12-finalize lineups avant patch');
  assertBefore(stages, 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'v12-finalize V11 avant V12');
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'v12-finalize V12 avant V13');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_decision_exports.py', 'v12-finalize V13 avant exports');
  assertDecisionOutputs(stages, 'v12-finalize');
}

function testV12TicketNow() {
  const { stages } = runDry(['--v12-ticket-now']);
  for (const stage of ['build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v12-ticket-now ${stage}`);
  }
  assert(!stages.some((stage) => stage.startsWith('fetch_')), 'v12-ticket-now ne doit pas lancer de fetch', { stages });
  assertBefore(stages, 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'v12-ticket-now V10 avant V11');
  assertBefore(stages, 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'v12-ticket-now V11 avant V12');
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'v12-ticket-now V12 avant V13');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_decision_exports.py', 'v12-ticket-now V13 avant exports');
}

function testV13PriceAlerts() {
  const { stages } = runDry(['--v13-price-alerts']);
  for (const stage of ['fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'patch_winamax_markets.py', 'snapshot_odds.py', 'compute_clv.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v13-price-alerts ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v13-price-alerts ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v13-price-alerts ne doit pas lancer team_stats lourd', { stages });
  assert(!stages.includes('fetch_lineups_soccer.py'), 'v13-price-alerts reste prix et ne relance pas lineups', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'v13-price-alerts détails avant snapshot');
  assertBefore(stages, 'snapshot_odds.py', 'compute_clv.py', 'v13-price-alerts snapshot avant CLV');
  assertBefore(stages, 'compute_clv.py', 'build_v10_finalizer.py', 'v13-price-alerts CLV avant V10');
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'v13-price-alerts V12 avant V13');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_decision_exports.py', 'v13-price-alerts V13 avant exports');
}

function testV13T10Resolve() {
  const { stages } = runDry(['--v13-t10-resolve']);
  for (const stage of ['fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v13-t10-resolve ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v13-t10-resolve ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v13-t10-resolve garde un T-10 court', { stages });
  assertBefore(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'v13-t10-resolve détails avant patch');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v13-t10-resolve lineups avant patch');
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'v13-t10-resolve V12 avant V13');
  assertDecisionOutputs(stages, 'v13-t10-resolve');
}

function testV13FinalizeNow() {
  const { stages } = runDry(['--v13-finalize-now']);
  for (const stage of ['fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'compute_clv.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v13-finalize-now ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v13-finalize-now ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v13-finalize-now garde un T-10 court', { stages });
  assertBefore(stages, 'snapshot_odds.py', 'compute_clv.py', 'v13-finalize-now snapshot avant CLV');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v13-finalize-now lineups avant patch');
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'v13-finalize-now V12 avant V13');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_decision_exports.py', 'v13-finalize-now V13 avant exports');
  assertDecisionOutputs(stages, 'v13-finalize-now');
}

function testV13TicketOffline() {
  const { stages } = runDry(['--v13-ticket-offline']);
  for (const stage of ['build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v13-ticket-offline ${stage}`);
  }
  assert(!stages.some((stage) => stage.startsWith('fetch_')), 'v13-ticket-offline ne doit pas lancer de fetch', { stages });
  assertBefore(stages, 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'v13-ticket-offline V12 avant V13');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_decision_exports.py', 'v13-ticket-offline V13 avant exports');
}

function testV14Audit() {
  const { stages } = runDry(['--v14-audit']);
  for (const stage of ['build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v14-audit ${stage}`);
  }
  assert(!stages.some((stage) => stage.startsWith('fetch_')), 'v14-audit ne doit pas lancer de fetch', { stages });
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_v14_quality_audit.py', 'v14-audit V13 avant V14');
  assertBefore(stages, 'build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', 'v14-audit V14 avant V15');
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'v14-audit V15 avant V16');
  assertBefore(stages, 'build_v16_final_decision.py', 'build_decision_exports.py', 'v14-audit V16 avant exports');
  assertBefore(stages, 'build_v14_quality_audit.py', 'build_health.py', 'v14-audit V14 avant santé');
}

function testV14Fix() {
  const { stages } = runDry(['--v14-fix']);
  for (const stage of ['fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v10_finalizer.py', 'build_v11_finalizer.py', 'build_v12_price_watch.py', 'build_v13_price_alerts.py', 'build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v14-fix ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v14-fix ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v14-fix garde une correction courte', { stages });
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v14-fix lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_v10_finalizer.py', 'v14-fix contexte avant V10');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_v14_quality_audit.py', 'v14-fix V13 avant V14');
  assertDecisionOutputs(stages, 'v14-fix');
}

function testV15Audit() {
  const { stages } = runDry(['--v15-audit']);
  for (const stage of ['build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v15-audit ${stage}`);
  }
  assert(!stages.some((stage) => stage.startsWith('fetch_')), 'v15-audit ne doit pas lancer de fetch', { stages });
  assertBefore(stages, 'build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', 'v15-audit V14 avant V15');
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'v15-audit V15 avant V16');
  assertBefore(stages, 'build_v16_final_decision.py', 'build_decision_exports.py', 'v15-audit V16 avant exports');
}

function testV15Fix() {
  const { stages } = runDry(['--v15-fix']);
  for (const stage of ['fetch_clubelo.py', 'fetch_team_form.py', 'build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v15-fix ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v15-fix ne doit pas lancer fetch_v3', { stages });
  assertBefore(stages, 'fetch_clubelo.py', 'build_v15_operational_cleanup.py', 'v15-fix sources avant V15');
  assertBefore(stages, 'build_v14_quality_audit.py', 'build_v15_operational_cleanup.py', 'v15-fix V14 avant V15');
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'v15-fix V15 avant V16');
}

function testV16SourceRefresh() {
  const { stages } = runDry(['--v16-source-refresh']);
  for (const stage of ['fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_weather.py', 'fetch_team_form.py', 'fetch_h2h.py', 'fetch_understat_xg.py', 'patch_all_quick.py', 'build_match_context.py', 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v16-source-refresh ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v16-source-refresh ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v16-source-refresh évite team_stats lourd', { stages });
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'v16-source-refresh lineups avant patch');
  assertBefore(stages, 'build_match_context.py', 'build_v15_operational_cleanup.py', 'v16-source-refresh contexte avant V15');
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'v16-source-refresh V15 avant V16');
  assertBefore(stages, 'build_v16_final_decision.py', 'build_decision_exports.py', 'v16-source-refresh V16 avant exports');
}

function testV16T10Final() {
  const { stages } = runDry(['--v16-t10-final']);
  for (const stage of ['fetch_winamax_catalog.py', 'patch_winamax.py', 'patch_winamax_markets.py', 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'compute_clv.py', 'build_v13_price_alerts.py', 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v16-t10-final ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v16-t10-final ne doit pas lancer fetch_v3', { stages });
  for (const stage of ['fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_team_stats.py', 'fetch_h2h.py', 'fetch_understat_xg.py', 'build_match_context.py']) {
    assert(!stages.includes(stage), `v16-t10-final ne doit pas relancer ${stage}`, { stages });
  }
  assertBefore(stages, 'snapshot_odds.py', 'compute_clv.py', 'v16-t10-final snapshot avant CLV');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_v15_operational_cleanup.py', 'v16-t10-final V13 avant V15');
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'v16-t10-final V15 avant V16');
  assertBefore(stages, 'build_v16_final_decision.py', 'build_decision_exports.py', 'v16-t10-final V16 avant exports');
}

function testV16Finalize() {
  const { stages } = runDry(['--v16-finalize']);
  for (const stage of ['fetch_winamax_catalog.py', 'snapshot_odds.py', 'compute_clv.py', 'fetch_winamax_match_details.py', 'fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'build_v13_price_alerts.py', 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'build_decision_exports.py', 'build_health.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `v16-finalize ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'v16-finalize ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'v16-finalize garde un workflow court', { stages });
  assertBefore(stages, 'snapshot_odds.py', 'compute_clv.py', 'v16-finalize snapshot avant CLV');
  assertBefore(stages, 'build_v13_price_alerts.py', 'build_v15_operational_cleanup.py', 'v16-finalize V13 avant V15');
  assertBefore(stages, 'build_v15_operational_cleanup.py', 'build_v16_final_decision.py', 'v16-finalize V15 avant V16');
  assertBefore(stages, 'build_v16_final_decision.py', 'build_decision_exports.py', 'v16-finalize V16 avant exports');
}

function testCritical() {
  const { stages, output } = runDry(['--critical']);
  assert(output.includes('dry-run:'), 'résumé dry-run critical absent', { output });
  for (const stage of ['fetch_live.py', 'fetch_winamax_match_details.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'build_match_context.py', 'build_stake_reduction_backtest.py', 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'build_prebet_checklist_backtest.py', 'finalize_inline.py']) {
    assertIncludes(stages, stage, `critical ${stage}`);
  }
  assert(!stages.includes('fetch_v3.py'), 'critical ne doit pas lancer fetch_v3', { stages });
  assert(!stages.includes('fetch_team_stats.py'), 'critical ne doit pas lancer team_stats lourd', { stages });
  assertDecisionOutputs(stages, 'critical');
  assertBefore(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'critical lineups avant patch');
  assertBefore(stages, 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'critical réparation avant file refresh');
  assertBefore(stages, 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'critical file avant checklist');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_health.py', 'critical checklist avant santé');
  assertBefore(stages, 'build_prebet_checklist_backtest.py', 'build_health.py', 'critical backtest checklist avant santé');
}

function testRepairContext() {
  const { stages, output } = runDry(['--repair-context']);
  assert(output.includes('dry-run:'), 'résumé dry-run réparation contexte absent', { output });
  assertIncludes(stages, 'build_match_context.py', 'réparation contexte dossiers');
  assertIncludes(stages, 'build_context_repair_plan.py', 'réparation contexte plan');
  assertIncludes(stages, 'build_refresh_priority_plan.py', 'réparation contexte file refresh');
  assertIncludes(stages, 'build_prebet_checklist.py', 'réparation contexte checklist');
  assertIncludes(stages, 'finalize_inline.py', 'réparation contexte finalize');
  assertBefore(stages, 'patch_all_quick.py', 'build_match_context.py', 'réparation patch avant contexte');
  assertBefore(stages, 'build_match_context.py', 'build_context_repair_plan.py', 'réparation contexte avant plan');
  assertBefore(stages, 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'réparation plan avant file');
  assertBefore(stages, 'build_prebet_checklist.py', 'build_health.py', 'réparation checklist avant santé');
  assert(!stages.includes('fetch_v3.py'), 'réparation contexte ne doit pas lancer fetch_v3', { stages });
  assertDecisionOutputs(stages, 'réparation contexte');
}

function testSignalSources() {
  const teamStats = runDry(['--signals', '--signal-source', 'team_stats']).stages;
  assertIncludes(teamStats, 'fetch_understat_xg.py', 'signals team_stats xG');
  assertIncludes(teamStats, 'fetch_team_stats.py', 'signals team_stats stats');
  assertBefore(teamStats, 'fetch_understat_xg.py', 'fetch_team_stats.py', 'signals xG avant stats');
  assertBefore(teamStats, 'fetch_team_stats.py', 'patch_all_quick.py', 'signals stats avant patch');
  assertBefore(teamStats, 'build_xg_coverage.py', 'build_health.py', 'signals rapports avant santé');
  assertBefore(teamStats, 'build_match_context.py', 'build_health.py', 'signals contexte avant santé');
  assertBefore(teamStats, 'build_picks_history.py', 'build_context_backtest.py', 'signals historique avant backtest contexte');
  assertBefore(teamStats, 'build_context_backtest.py', 'build_decision_backtest.py', 'signals backtest contexte avant décision');
  assertBefore(teamStats, 'build_decision_backtest.py', 'build_decision_tuning.py', 'signals décision avant tuning');
  assertBefore(teamStats, 'build_decision_tuning.py', 'build_decision_shadow.py', 'signals tuning avant shadow');
  assertBefore(teamStats, 'build_decision_shadow.py', 'build_health.py', 'signals shadow avant santé');
  assertBefore(teamStats, 'build_odds_guardrails.py', 'build_health.py', 'signals garde-fous cotes avant santé');
  assertBefore(teamStats, 'build_agent_guardrail_recommendations.py', 'build_health.py', 'signals conseils garde-fous avant santé');
  assertBefore(teamStats, 'build_stake_reduction_backtest.py', 'build_health.py', 'signals réduction de mise avant santé');
  assertBefore(teamStats, 'build_signal_coverage_trend.py', 'build_health.py', 'signals tendance couverture avant santé');
  assertBefore(teamStats, 'build_next_actions.py', 'build_health.py', 'signals prochaines actions avant santé');
  assertBefore(teamStats, 'build_source_freshness_plan.py', 'build_health.py', 'signals plan fraîcheur avant santé');
  assertBefore(teamStats, 'build_context_repair_plan.py', 'build_health.py', 'signals réparation contexte avant santé');
  assertBefore(teamStats, 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'signals réparation avant file');
  assertBefore(teamStats, 'build_refresh_priority_plan.py', 'build_health.py', 'signals file refresh avant santé');
  assertIncludes(teamStats, 'build_prebet_checklist.py', 'signals checklist avant mise');
  assertIncludes(teamStats, 'build_prebet_checklist_backtest.py', 'signals backtest checklist');
  assertBefore(teamStats, 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'signals file avant checklist');
  assertBefore(teamStats, 'build_prebet_checklist.py', 'build_health.py', 'signals checklist avant santé');
  assertBefore(teamStats, 'build_prebet_checklist_backtest.py', 'build_health.py', 'signals backtest checklist avant santé');
  assertBefore(teamStats, 'compute_clv.py', 'build_health.py', 'signals CLV avant santé');
  assertDecisionOutputs(teamStats, 'signals team_stats');

  const xgAlias = runDry(['--signals', '--signal-source', 'xg']).stages;
  assertIncludes(xgAlias, 'fetch_understat_xg.py', 'alias xg');
  assertIncludes(xgAlias, 'fetch_team_stats.py', 'alias xg team stats');

  const weather = runDry(['--signals', '--signal-source', 'weather']).stages;
  assertIncludes(weather, 'fetch_weather.py', 'signals weather');
  assert(!weather.includes('fetch_team_stats.py'), 'weather ne doit pas lancer team_stats', { stages: weather });
  assertBefore(weather, 'fetch_weather.py', 'patch_all_quick.py', 'signals weather avant patch');
  assertBefore(weather, 'build_match_context.py', 'build_health.py', 'signals weather contexte avant santé');
  assertDecisionOutputs(weather, 'signals weather');

  const context = runDry(['--signals', '--signal-source', 'context']).stages;
  assertIncludes(context, 'build_match_context.py', 'signals contexte');
  assertIncludes(context, 'build_decision_backtest.py', 'signals contexte décision');
  assertIncludes(context, 'compute_clv.py', 'signals CLV');
  assertIncludes(context, 'build_decision_shadow.py', 'signals contexte shadow');
  assertIncludes(context, 'build_odds_guardrails.py', 'signals contexte garde-fous cotes');
  assertIncludes(context, 'build_agent_blocker_backtest.py', 'signals backtest blocages agent');
  assertIncludes(context, 'build_agent_guardrail_recommendations.py', 'signals conseils garde-fous agent');
  assertIncludes(context, 'build_stake_reduction_backtest.py', 'signals backtest réduction de mise');
  assertIncludes(context, 'build_scorer_quality.py', 'signals qualité buteurs');
  assertIncludes(context, 'archive_scorer_candidates.py', 'signals archive buteurs');
  assertIncludes(context, 'settle_scorer_candidates.py', 'signals settlement buteurs');
  assertIncludes(context, 'build_scorer_pending_audit.py', 'signals audit pending buteurs');
  assertIncludes(context, 'build_prematch_focus.py', 'signals focus pré-match');
  assertIncludes(context, 'build_prematch_execution_plan.py', 'signals plan pré-match');
  assertIncludes(context, 'build_signal_coverage_trend.py', 'signals tendance couverture');
  assertIncludes(context, 'build_next_actions.py', 'signals prochaines actions');
  assertIncludes(context, 'build_source_freshness_plan.py', 'signals plan fraîcheur');
  assertIncludes(context, 'build_context_repair_plan.py', 'signals réparation contexte');
  assertIncludes(context, 'build_refresh_priority_plan.py', 'signals file refresh');
  assertIncludes(context, 'build_prebet_checklist.py', 'signals checklist avant mise');
  assertIncludes(context, 'build_prebet_checklist_backtest.py', 'signals backtest checklist');
  assertIncludes(context, 'build_health.py', 'signals contexte santé');
  assert(!context.includes('fetch_weather.py'), 'context ne doit pas relancer météo', { stages: context });
  assert(!context.includes('fetch_team_stats.py'), 'context ne doit pas relancer team_stats', { stages: context });
  assertBefore(context, 'build_match_context.py', 'build_health.py', 'signals contexte avant santé');
  assertBefore(context, 'build_decision_backtest.py', 'build_health.py', 'signals décision avant santé');
  assertBefore(context, 'build_decision_tuning.py', 'build_health.py', 'signals tuning avant santé');
  assertBefore(context, 'build_decision_shadow.py', 'build_health.py', 'signals shadow avant santé');
  assertBefore(context, 'build_stake_reduction_backtest.py', 'build_health.py', 'signals réduction de mise avant santé');
  assertBefore(context, 'build_prematch_focus.py', 'build_health.py', 'signals focus avant santé');
  assertBefore(context, 'build_prematch_execution_plan.py', 'build_health.py', 'signals plan avant santé');
  assertBefore(context, 'build_signal_coverage_trend.py', 'build_health.py', 'signals tendance avant santé');
  assertBefore(context, 'build_next_actions.py', 'build_health.py', 'signals prochaines actions avant santé');
  assertBefore(context, 'build_source_freshness_plan.py', 'build_health.py', 'signals plan fraîcheur avant santé');
  assertBefore(context, 'build_context_repair_plan.py', 'build_health.py', 'signals réparation contexte avant santé');
  assertBefore(context, 'build_context_repair_plan.py', 'build_refresh_priority_plan.py', 'signals réparation avant file');
  assertBefore(context, 'build_refresh_priority_plan.py', 'build_health.py', 'signals file refresh avant santé');
  assertBefore(context, 'build_refresh_priority_plan.py', 'build_prebet_checklist.py', 'signals file avant checklist');
  assertBefore(context, 'build_prebet_checklist.py', 'build_health.py', 'signals checklist avant santé');
  assertBefore(context, 'build_prebet_checklist_backtest.py', 'build_health.py', 'signals backtest checklist avant santé');
  assertDecisionOutputs(context, 'signals context');
}

testQuick();
testFull();
testPrematch();
testPrematchT60();
testPrematchT30();
testPrematchT10();
testV7Finalize();
testV8PrepareNow();
testV9FinalizeNow();
testV10Finalize();
testV11T10Fast();
testV11Finalize();
testV11RepairNow();
testV12PriceWatch();
testV12Finalize();
testV12TicketNow();
testV13PriceAlerts();
testV13T10Resolve();
testV13FinalizeNow();
testV13TicketOffline();
testV14Audit();
testV14Fix();
testV15Audit();
testV15Fix();
testV16SourceRefresh();
testV16T10Final();
testV16Finalize();
testCritical();
testRepairContext();
testSignalSources();

console.log('Refresh contract OK: quick/prematch/T-60/T-30/T-10/V7/V8/V9/V10/V11/V12/V13/V14/V15/V16/critical/repair/full/signaux dry-run validés.');
