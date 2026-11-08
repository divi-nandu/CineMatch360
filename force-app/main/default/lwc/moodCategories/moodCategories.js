import { LightningElement } from "lwc";

export default class MoodCategories extends LightningElement {
  selectedMood = "";

  moods = [
    {
      name: "Feel Good",
      icon: "😊",
      description: "Movies that lift your mood"
    },
    {
      name: "Emotional",
      icon: "😢",
      description: "Stories that touch your heart"
    },
    {
      name: "Thriller",
      icon: "😱",
      description: "Mystery, suspense and twists"
    },
    {
      name: "Action",
      icon: "🦸",
      description: "Adventure and excitement"
    }
  ];

  get displayMoods() {
    return this.moods.map((mood) => ({
      ...mood,
      cssClass:
        this.selectedMood === mood.name ? "mood-card selected" : "mood-card"
    }));
  }

  handleMoodClick(event) {
    const mood = event.currentTarget.dataset.mood;

    this.selectedMood = mood;

    this.dispatchEvent(
      new CustomEvent("moodselect", {
        detail: mood,
        bubbles: true,
        composed: true
      })
    );
  }
}
