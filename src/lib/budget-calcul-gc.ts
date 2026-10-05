import { creerBudget } from "./limite-debit.ts";

/**
 * LE BUDGET DE CALCUL DU GARDE-CORPS, partagé par toutes les portes qui le calculent (fiche, aperçu du plan, panier, commande).
 * Un relevé jamais vu coûte de 0,35 à 3,4 s sur le seul fil du serveur (une fenêtre large, une petite rosace), 0,1 s s'il a déjà
 * été calculé ; un panier de 19 fenêtres, près de 5 s. Compter les requêtes ne suffisait pas (120 × 3 s = 6 minutes de calcul) :
 * 90 s par adresse et par dix minutes (de quoi essayer plusieurs dizaines de fenêtres), 400 s pour l'instance entière. Au-delà,
 * 429 plutôt qu'un site qui ne répond plus à personne.
 */
export const budgetCalculGC = creerBudget({ fenetreMs: 10 * 60 * 1000, budgetMs: 90_000, budgetGlobalMs: 400_000 });
