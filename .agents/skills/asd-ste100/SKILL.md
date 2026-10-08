---
name: asd-ste100
description: Apply ASD-STE100 guidance when creating or editing technical prose, including procedures, READMEs, technical course notes, and summaries. Review language and terminology while preserving technical meaning and exact identifiers.
---

# ASD-STE100 for technical writing

Use ASD-STE100 Simplified Technical English, Issue 9, dated January 15, 2025, as the baseline for this project.
This skill contains selected guidance and project conventions. It does not replace the complete standard or its dictionary.
Use the official standard to resolve detailed rule questions and to verify compliance.

## Scope and precedence

Apply this skill to English technical prose that you create or edit, including prose in Word, PDF, slides, and spreadsheets.
In mixed documents, apply it to technical passages. Personal advice and strategy retain the voice required by `AGENTS.md`.
Use neutral language for technical facts. Do not add opinions, invented details, or informal asides to satisfy another writing skill.
Technical accuracy takes priority over stylistic simplification. Keep limits, exceptions, prerequisites, units, and causal relationships intact.

Exact code, commands, paths, identifiers, API names, UI labels, quotations, and externally controlled wording are protected source content.
Do not change them to satisfy vocabulary or length rules. Simplify the surrounding explanation.
If protected wording prevents compliance, report that limitation when compliance is requested.

## Selected writing rules

### Procedures and safety instructions

- Limit procedural sentences, including safety instructions, to 20 words. Refer to rule 5.1.
- Give one instruction per sentence, except for actions that must occur simultaneously. Refer to rule 5.2.
- Use command verbs for instructions. Refer to rule 5.3.
- Put a condition first when the reader needs it before acting. Separate the condition from the command with a comma. Refer to rule 5.4.
- Use notes for information only. Keep required actions in the procedure. Refer to rule 5.5.

### Descriptions

- Limit descriptive sentences to 25 words. Refer to rule 6.3.
- Keep each paragraph on one topic. Start with the topic and connect the supporting information. Refer to rule 6.5.
- Use active voice. Use passive voice in descriptions only when the actor is unknown. Do not use passive instructions.

### Vocabulary and grammar

Use dictionary words only with their approved meanings and parts of speech.
Use consistent technical nouns and verbs for the subject. Do not replace a term with synonyms for variety.
Technical terms can include words outside the general dictionary, subject to the standard's terminology rules.
Do not treat every unfamiliar word as an approved technical term.

Avoid ambiguous verb forms ending in `-ing`. This is not a ban on every word with that ending.
Technical nouns and approved dictionary words can have that ending.
Consult the dictionary for uncertain cases rather than guessing whether a word or meaning is approved.

## Project conventions

The following practices support clarity. They are not a complete or independently verified list of STE requirements.

- Put prerequisites before the affected steps. Number actions in execution order.
- Use explicit subjects and references. Name the component when a pronoun could refer to several things.
- Explain dense noun groups without changing the established term. Keep necessary articles and verbs when shortening prose.
- Record recurring technical terms, definitions, and source authority in a document glossary or existing project terminology list.
- Preserve warning and caution labels, hazards, consequences, and preventive actions. Place the instruction before the affected action.
- Keep source-controlled safety wording intact. Do not invent hazards, remove restrictions, or alter severity to improve style.
- Treat headings, table labels, and slide labels as labels. Apply sentence rules to complete sentences and explanatory prose.
- Preserve factual uncertainty and required qualifications. Do not turn a possibility into a certainty.

## Review workflow

1. Identify procedural text, descriptive text, labels, and protected source content.
2. Identify the technical terms and their source definitions. Keep their names consistent.
3. Edit the prose using the applicable rules. Preserve factual meaning and required conditions.
4. Review sentence length, action order, references, voice, terminology, and safety information.
5. For formal compliance, check all applicable rules and general vocabulary against the official standard and dictionary.

For sentence counts in a compliance review, use the standard's counting rules, not a simple space count.
A short sentence can still have an unapproved word, an incorrect meaning, or an ambiguous instruction.
Do not claim dictionary approval from memory, plain-language substitutions, or a model-generated word list.
If the official text or terminology evidence is unavailable, state which checks remain unverified.
Use the term STE-guided for an editorial review without full verification. Do not claim certification or ASD endorsement.

## Project examples

These examples illustrate clarity. They have not been verified against the complete STE dictionary.

Before: "The server should be restarted after the configuration has been saved."

After:

1. Save the configuration.
2. Restart the server.

Before: "Click Save if all required fields are complete."

After: "If all required fields are complete, click `Save`."

Before: "The application utilizes a cache, enhancing response times."

After: "The application uses a cache to reduce response times."

Use the last rewrite only when the source supports the stated purpose of the cache.

## Official sources

- [ASD-STE100 homepage](https://asd-ste100.org/) identifies the current published issue. Check it when an edition update is requested.
- [About STE](https://asd-ste100.org/about_STE.html) explains the rules, dictionary, and technical terminology.
- [STEMG FAQ](https://asd-ste100.org/STE_faq.html) explains vocabulary restrictions, verb forms, and procedural versus descriptive voice.
- [Issue 9 official standard](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf) is the authority for exact rules, counting conventions, and dictionary entries.
- [Official downloads](https://www.asd-ste100.org/STE_downloads.html) provides a copy-request route and guidance on AI-assisted STE writing.
