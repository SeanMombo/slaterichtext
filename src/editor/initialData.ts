import { Descendant, Element as SlateElement } from 'slate';

// Function to parse text and convert citations to proper format
export const parseCitations = (text: string): Descendant[] => {
  const parts: Descendant[] = [];
  let lastIndex = 0;
  let currentParagraph: Descendant = {
    type: 'paragraph',
    children: []
  };
  
  // Match both {MM:SS} and {seconds.decimals} formats
  const citationRegex = /\{(\d+:\d+|\d+\.\d+)\}/g;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      // Split by newlines and handle each part
      const lines = textBefore.split('\n');
      
      // Add first line to current paragraph
      if (lines[0]) {
        currentParagraph.children.push({ text: lines[0] });
      }
      
      // Create new paragraphs for remaining lines
      for (let i = 1; i < lines.length; i++) {
        if (currentParagraph.children.length > 0) {
          parts.push(currentParagraph);
        }
        currentParagraph = {
          type: 'paragraph',
          children: lines[i] ? [{ text: lines[i] }] : []
        };
      }
    }

    // Add the citation
    currentParagraph.children.push({
      children: [{ text: `(${match[1]})`, type: 'badge' }],
      type: 'badge'
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    const lines = remainingText.split('\n');
    
    // Add first line to current paragraph
    if (lines[0]) {
      currentParagraph.children.push({ text: lines[0] });
    }
    
    // Create new paragraphs for remaining lines
    for (let i = 1; i < lines.length; i++) {
      if (currentParagraph.children.length > 0) {
        parts.push(currentParagraph);
      }
      currentParagraph = {
        type: 'paragraph',
        children: lines[i] ? [{ text: lines[i] }] : []
      };
    }
  }

  // Add the last paragraph if it has content
  if (currentParagraph.children.length > 0) {
    parts.push(currentParagraph);
  }

  // Add newline characters between paragraphs
  const result: Descendant[] = [];
  for (let i = 0; i < parts.length; i++) {
    result.push(parts[i]);
    if (i < parts.length - 1) {
      // Add a newline character at the end of each paragraph except the last one
      const paragraph = parts[i];
      if (SlateElement.isElement(paragraph) && paragraph.type === 'paragraph') {
        const lastChild = paragraph.children[paragraph.children.length - 1];
        if (lastChild && 'text' in lastChild) {
        //   lastChild.text = lastChild.text + '\n';
        }
      }
    }
  }

  return result;
};

export const initialText = "On May 8, 2025, at approximately 1751 hours, I, Officer Sean Mombo of the Abel Police Department, was on duty wearing department issued AVR when I responded to a vehicle accident at 530 3rd St, San Francisco, CA 94107.\n\nUpon arrival at the scene, I identified myself as SFPD to the involved parties {6.26}. I observed two civilians engaged in a verbal dispute regarding a vehicle collision. One individual was claiming that the other had struck their vehicle while backing up {11.663}. Both parties appeared agitated and were arguing about the circumstances of the collision.\n\nI immediately attempted to separate the parties to de-escalate the situation, repeatedly instructing them to \"Let's separate\" {14.584} and \"Stand back\" {116.746}. After creating distance between the individuals, I confirmed that neither party had sustained physical injuries by asking both if they were okay {97.562}, to which they both indicated they were not injured {102.005}.\n\nI identified the involved parties as Chad Gates {39.92} and Alonzo Harris {146.961}. During my investigation, Mr. Gates admitted that he did not have his vehicle registration or proof of insurance with him, stating that these documents were in another vehicle {45.265}.\n\nThe parties provided conflicting accounts of the incident. One driver claimed they had not yet put their vehicle in reverse and had not moved at all when the collision occurred {65.861}. The other driver contradicted this statement, insisting that the vehicle had already been in motion {68.982}. One of the drivers mentioned having a rear view camera in their vehicle {77.545} but confirmed they did not have any recording of the incident {82.227}.\n\nI collected identification from both Mr. Gates and Mr. Harris to document the parties involved {162.627}. I advised both individuals that while the current situation was being handled as a traffic accident, continued confrontational behavior could potentially escalate the situation and result in additional legal consequences {154.484}.\n\nAfter gathering the necessary information from both parties, I concluded my investigation at the scene. My body-worn camera was active throughout the entire interaction, documenting the exchange between the involved parties and my response to the incident.\n\nThis report was created with the help of Abel Writer AI writing assistant.";

export const initialValue: Descendant[] = parseCitations(initialText); 