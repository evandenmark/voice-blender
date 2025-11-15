const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const API_BASE = 'https://api.elevenlabs.io/v1'
const CARTESIA_API_BASE = 'https://api.cartesia.ai'
const CARTESIA_API_KEY = import.meta.env.VITE_CARTESIA_API_KEY
const CARTESIA_VERSION = import.meta.env.VITE_CARTESIA_VERSION


if (!API_KEY) {
  console.warn('VITE_ELEVENLABS_API_KEY is not set. Please add it to your .env file.')
}

/**
 * Fetch all available voices from ElevenLabs
 */
export async function getVoices() {
  if (!API_KEY) {
    throw new Error('API key not configured')
  }

  const response = await fetch(`${API_BASE}/voices`, {
    headers: {
      'xi-api-key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.statusText}`)
  }

  const data = await response.json()
  return data.voices || []
}

/**
 * Blend two voices using ElevenLabs API
 * Note: ElevenLabs doesn't have a direct voice blending endpoint,
 * so we'll use voice cloning/remixing or generate audio with mixed characteristics
 */
export async function blendVoices(voiceIds, blendPosition, text, blendMethod, voiceMapping) {
  if (!API_KEY) {
    throw new Error('API key not configured')
  }

  if (!voiceIds[0] || !voiceIds[1]) {
    throw new Error('Two voices must be selected')
  }

  if (!text || !text.trim()) {
    throw new Error('Text is required')
  }

  // Calculate blend ratios
  const voice1Ratio = 1 - blendPosition.x
  const voice2Ratio = blendPosition.x


  //option 1: change the voice that has most weight using speech-to-speech
  //https://api.elevenlabs.io/v1/speech-to-speech/:voice_id

  // Pick primary and secondary voices based on which has the higher ratio
  const [voiceA, voiceB] = voiceIds
  let primaryVoiceId, secondaryVoiceId, primaryRatio, secondaryRatio, primaryVoiceName, secondaryVoiceName

  if (voice1Ratio >= voice2Ratio) {
    primaryVoiceId = voiceA
    secondaryVoiceId = voiceB
    primaryRatio = voice1Ratio
    secondaryRatio = voice2Ratio
  } else {
    primaryVoiceId = voiceB
    secondaryVoiceId = voiceA
    primaryRatio = voice2Ratio
    secondaryRatio = voice1Ratio
  }
  primaryVoiceName = voiceMapping[primaryVoiceId]
  secondaryVoiceName = voiceMapping[secondaryVoiceId]

  // 1. Get a voice sample from the PRIMARY voice (before blending)
  const primarySampleResp = await fetch(
    `${API_BASE}/text-to-speech/${primaryVoiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 1.0,
        },
      }),
    }
  )

  if (!primarySampleResp.ok) {
    const errorText = await primarySampleResp.text()
    throw new Error(`Failed to get sample from primary voice: ${primarySampleResp.statusText} - ${errorText}`)
  }

  const primarySampleAudio = await primarySampleResp.blob()
  const primarySampleAudioFile = new File([primarySampleAudio], "primary_sample.wav", { type: primarySampleAudio.type })
  
  // Create a URL for the primary sample so it can be played
  const primarySampleUrl = URL.createObjectURL(primarySampleAudio)

  // 2. Get a voice sample from the SECONDARY voice (it is needed to modify the primary voice)
  const secondarySampleResp = await fetch(
    `${API_BASE}/text-to-speech/${secondaryVoiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 1.0,
        },
      }),
    }
  )

  if (!secondarySampleResp.ok) {
    const errorText = await secondarySampleResp.text()
    throw new Error(`Failed to get sample from secondary voice: ${secondarySampleResp.statusText} - ${errorText}`)
  }

  const secondarySampleAudio = await secondarySampleResp.blob()
  const secondarySampleAudioFile = new File([secondarySampleAudio], "secondary_sample.wav", { type: secondarySampleAudio.type })
  
  // Create a URL for the secondary sample so it can be played
  const secondarySampleUrl = URL.createObjectURL(secondarySampleAudio)

  // 3. Format blend variables 

  const blendPercent = Math.round(secondaryRatio * 100)
  const blendName = `Blend_${primaryVoiceName}${Math.round(primaryRatio*100)}_${secondaryVoiceName}${Math.round(secondaryRatio*100)}`
  
  // 4. Blend the voices by changing the primary voice to sound XX% like the secondary voice

  let audioUrl;
  let blendedAudioBlob; 
  
  switch (blendMethod) {
    case 'speech2speech':
      
      // OPTION 1: USE SPEECH-TO-SPEECH remixing. Make Voice 1 sound more like voice 2 via speech. 

      const designText = `Remix this voice to sound ${Math.round(primaryRatio*100)}% more like voice with id ${secondaryVoiceId}.`

      // Note: speech-to-speech endpoint requires FormData for file uploads
      const blendFormData = new FormData()
      blendFormData.append('audio', secondarySampleAudioFile)
      blendFormData.append('name', blendName)
      blendFormData.append('description', designText)

      const blendResponse = await fetch(`${API_BASE}/speech-to-speech/${primaryVoiceId}`, {
      method: 'POST',
      headers: {
          'xi-api-key': API_KEY,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: blendFormData,
      })
      
      if (!blendResponse.ok) {
        const errorText = await blendResponse.text()
        throw new Error(`Failed to create blended voice: ${blendResponse.statusText} - ${errorText}`)
      }

      // The speech-to-speech endpoint returns audio directly, not JSON
      // Convert the blended audio response to a blob and create object URL
      const speech2speechAudioBlob = await blendResponse.blob()
      audioUrl = URL.createObjectURL(speech2speechAudioBlob)
      blendedAudioBlob = speech2speechAudioBlob;

      break;


    case 'text':
    
      // OPTION 2: Create an entirely new voice via text description 

      // first design a new voice
      const designResponse = await fetch(`${API_BASE}/text-to-voice/design`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: blendName,
          voice_description: `A voice that is ${Math.round(primaryRatio*100)}% like voice ID ${primaryVoiceId} and ${blendPercent}% like voice ID ${secondaryVoiceId}.`,
          guidance_scale: 80,
          quality: 1, 
          auto_generate_text: true
        }),
      })

      if (!designResponse.ok) {
        const errorText = await designResponse.text()
        throw new Error(`Failed to design new blended voice: ${designResponse.statusText} - ${errorText}`)
      }

      //the design response will return a few voices. Arbitrarily pick the first one
      
      const designData = await designResponse.json();
      const selectedVoice = designData.previews[0].generated_voice_id;

      // then create a new voice
      const createVoiceResponse = await fetch(`${API_BASE}/text-to-voice`, {

        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_name: blendName,
          voice_description: `A voice that is ${Math.round(primaryRatio*100)}% like voice ID ${primaryVoiceId} and ${blendPercent}% like voice ID ${secondaryVoiceId}.`,
          generated_voice_id: selectedVoice,
        }),
      });

      if (!createVoiceResponse.ok) {
        const errorText = await createVoiceResponse.text()
        throw new Error(`Failed to create new blended voice: ${createVoiceResponse.statusText} - ${errorText}`)
      }

      // Use the new generated voice id to synthesize audio for the text
      const ttsResponse = await fetch(`${API_BASE}/text-to-speech/${selectedVoice}`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 1
          }
        }),
      })

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text()
        throw new Error(`Failed to synthesize speech for new voice: ${ttsResponse.statusText} - ${errorText}`)
      }

      // Get the audio as a blob, create its object URL
      const ttsAudioBlob = await ttsResponse.blob()
      audioUrl = URL.createObjectURL(ttsAudioBlob)

      blendedAudioBlob = ttsAudioBlob;
      break;

    case 'ivc':

      // Create a new voice via IVC by uploading both primary and secondary sample audio

      // 1. Prepare FormData with both samples
      const formData = new FormData();
      // Main sample
      formData.append('files', primarySampleAudio, 'primary_sample.wav');
      // Secondary sample (optional field can be used multiple times for multi-reference)
      if (secondarySampleAudio) {
        formData.append('files', secondarySampleAudio, 'secondary_sample.wav');
      }
      // Name & description
      formData.append('name', blendName);
      formData.append(
        'description',
        `A blended voice generated from ${Math.round(voice1Ratio*100)}% ${primaryVoiceId}, ${Math.round(voice2Ratio*100)}% ${secondaryVoiceId}.`
      );
      // The API expects 'labels' for custom grouping (optional)
      formData.append('labels', JSON.stringify({ type: "ivc-blend", primary: primaryVoiceId, secondary: secondaryVoiceId }));

      // 2. Upload samples & register new voice
      const addVoiceResp = await fetch(`${API_BASE}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          // Do not set Content-Type (browser will set proper multipart/form-data boundary)
          // 'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!addVoiceResp.ok) {
        const errorText = await addVoiceResp.text();
        throw new Error(`Failed to create new blended voice via IVC: ${addVoiceResp.statusText} - ${errorText}`);
      }

      const addVoiceData = await addVoiceResp.json();
      const newVoiceId = addVoiceData.voice_id;
      if (!newVoiceId) {
        throw new Error('No voice_id returned after adding voice via IVC');
      }

      // 3. Synthesize speech for the input text using the newly created voice
      const ivcTTSResp = await fetch(`${API_BASE}/text-to-speech/${newVoiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 1.0,
          }
        }),
      });

      console.log("SUCCESFULLY SYNTHESIZED SPEECH FOR BLENDED IVC VOICE", newVoiceId);

      if (!ivcTTSResp.ok) {
        const errorText = await ivcTTSResp.text();
        throw new Error(`Failed to synthesize speech for blended IVC voice: ${ivcTTSResp.statusText} - ${errorText}`);
      }

      const ivcAudioBlob = await ivcTTSResp.blob();
      audioUrl = URL.createObjectURL(ivcAudioBlob);
      blendedAudioBlob = ivcAudioBlob;
      break;

    case 'cartesia':
      // get the audio clip from ElevenLabs for primary and secondary voices

      // 1. Clone the primary voice into Cartesia

      console.log("CLONING PRIMARY VOICE INTO CARTESIA");
      // Prepare form data for primary voice
      const primaryCartesiaForm = new FormData();
      primaryCartesiaForm.append('name', `${primaryVoiceName}_clone`);
      primaryCartesiaForm.append('description', `Clone of primary voice: ${primaryVoiceName}`);
      primaryCartesiaForm.append('language', 'en');
      primaryCartesiaForm.append('mode', 'similarity');
      primaryCartesiaForm.append('enhance', 'false');
      primaryCartesiaForm.append('clip', primarySampleAudioFile);

      const primaryCloneOptions = {
        method: 'POST',
        headers: {
          'Cartesia-Version': CARTESIA_VERSION,
          'X-API-Key': CARTESIA_API_KEY
          // Don't set Content-Type for FormData
        },
        body: primaryCartesiaForm
      };

      let primaryCartesiaVoiceId;
      try {
        const response = await fetch(`${CARTESIA_API_BASE}/voices/clone`, primaryCloneOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Failed to clone primary voice in Cartesia");
        primaryCartesiaVoiceId = data.id;
        if (!primaryCartesiaVoiceId) throw new Error("No voice_id returned for Cartesia primary clone.");
      } catch (error) {
        console.error("Error cloning primary voice in Cartesia:", error);
        throw error;
      }

      // 2. Clone the secondary voice into Cartesia

      console.log("CLONING SECONDARY VOICE INTO CARTESIA");

      // Prepare form data for secondary voice
      const secondaryCartesiaForm = new FormData();
      secondaryCartesiaForm.append('name', `${secondaryVoiceName}_clone`);
      secondaryCartesiaForm.append('description', `Clone of secondary voice: ${secondaryVoiceName}`);
      secondaryCartesiaForm.append('language', 'en');
      secondaryCartesiaForm.append('mode', 'similarity');
      secondaryCartesiaForm.append('enhance', 'false');
      secondaryCartesiaForm.append('clip', secondarySampleAudioFile);

      const secondaryCloneOptions = {
        method: 'POST',
        headers: {
          'Cartesia-Version': CARTESIA_VERSION,
          'X-API-Key': CARTESIA_API_KEY
        },
        body: secondaryCartesiaForm
      };

      let secondaryCartesiaVoiceId;
      try {
        const response = await fetch(`${CARTESIA_API_BASE}/voices/clone`, secondaryCloneOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Failed to clone secondary voice in Cartesia");
        secondaryCartesiaVoiceId = data.id;
        if (!secondaryCartesiaVoiceId) throw new Error("No voice_id returned for Cartesia secondary clone.");
      } catch (error) {
        console.error("Error cloning secondary voice in Cartesia:", error);
        throw error;
      }

      // 3. mix the voices together, using the ids. Returns an embedding
      // Mix the primary and secondary Cartesia voices together by calling the Cartesia /voices/mix API endpoint

      const mixUrl = `${CARTESIA_API_BASE}/voices/mix`;
      console.log("MIXING VOICES IN CARTESIA");

      // Prepare the weights using the same ratios as for blending
      const voicesToMix = [
        {
          id: primaryCartesiaVoiceId,
          weight: primaryRatio
        },
        {
          id: secondaryCartesiaVoiceId,
          weight: secondaryRatio
        }
      ];

      const mixOptions = {
        method: 'POST',
        headers: {
          'Cartesia-Version': CARTESIA_VERSION,
          'X-API-Key': CARTESIA_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voices: voicesToMix })
      };

      let mixVoiceEmbedding;
      try {
        const response = await fetch(mixUrl, mixOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Failed to mix voices in Cartesia");
        mixVoiceEmbedding = data.embedding; 
        if (!mixVoiceEmbedding) throw new Error("No mix embedding returned for Cartesia mix.");
      } catch (error) {
        console.error("Error mixing voices in Cartesia:", error);
        throw error;
      }
      
      // 4. creat a new voice from the embedding

      console.log("CREATING NEW VOICE IN CARTESIA FROM MIXED EMBEDDING");

      // Create a new voice in Cartesia using the embedding from the mix step
      let newCartesiaVoiceId;
      try {
        const createVoiceUrl = `${CARTESIA_API_BASE}/voices`;
        const createVoiceOptions = {
          method: 'POST',
          headers: {
            'Cartesia-Version': CARTESIA_VERSION,
            'X-API-Key': CARTESIA_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            embedding: mixVoiceEmbedding,
            name: blendName,
            description: `A blend of ${primaryVoiceName} (${Math.round(primaryRatio * 100)}%) and ${secondaryVoiceName} (${Math.round(secondaryRatio * 100)}%)`
          })
        };
        const createVoiceResp = await fetch(createVoiceUrl, createVoiceOptions);
        const createVoiceData = await createVoiceResp.json();
        if (!createVoiceResp.ok) throw new Error(createVoiceData?.message || "Failed to create blended Cartesia voice");
        newCartesiaVoiceId = createVoiceData.id;
        if (!newCartesiaVoiceId) throw new Error("No voice_id returned for blended Cartesia voice creation.");
      } catch (error) {
        console.error("Error creating blended Cartesia voice:", error);
        throw error;
      }

      // 5. synthesize speech for the input text using the new voice

      // Use Cartesia's TTS endpoint to synthesize speech from the input text using the new blended voice
      const ttsUrl = `${CARTESIA_API_BASE}/tts/bytes`;
      const ttsOptions = {
        method: 'POST',
        headers: {
          'Cartesia-Version': CARTESIA_VERSION,
          'X-API-Key': CARTESIA_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_id: "sonic-3-2025-10-27",
          transcript: text,
          voice: {
            mode: "id",
            id: newCartesiaVoiceId,
          },
          language: "en",
          output_format: {
            container: "wav",
            encoding: "pcm_f32le",
            sample_rate: 22050,
            bit_rate: 256
          }
        })
      };
      try {
        const ttsResponse = await fetch(ttsUrl, ttsOptions);
        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text();
          throw new Error(`Cartesia TTS failed: ${ttsResponse.statusText} - ${errorText}`);
        }
        // TTS returns raw audio bytes, wrap as blob and create object URL
        const ttsAudioBlob = await ttsResponse.blob();
        audioUrl = URL.createObjectURL(ttsAudioBlob);
        blendedAudioBlob = ttsAudioBlob;
      } catch (error) {
        console.error("Error synthesizing blended speech via Cartesia TTS:", error);
        throw error;
      }
      console.log("SUCCESFULLY SYNTHESIZED SPEECH FOR BLENDED CARTESIA VOICE");

      
      break;

    default:
      throw new Error(`Unknown blend mode: ${blendMethod}`)
  }
  
  
  //Lastly, we want to compare the blended audio with the primary and secondary for analysis
  let primaryMCD = null;
  let secondaryMCD = null;
  if (blendedAudioBlob) {
    const blendedAudioFile = new File([blendedAudioBlob], "blended.wav", { type: blendedAudioBlob.type })

    //compare the MCD (Mel Cepstral Distortion) of the blended audio with the primary
    const formDataPrimary = new FormData();
    formDataPrimary.append("voice_ref", primarySampleAudioFile);  
    formDataPrimary.append("voice_test", blendedAudioFile); 

    const primaryBlendComparisonResponse = await fetch("http://localhost:8000/mcd", {
        method: "POST",
        body: formDataPrimary,
    });
  
    const primaryBlendComparisonData = await primaryBlendComparisonResponse.json();

    //... and the MCD for the blended audio with the secondary
    const formDataSecondary = new FormData();
    formDataSecondary.append("voice_ref", secondarySampleAudioFile);   
    formDataSecondary.append("voice_test", blendedAudioFile);

    const secondaryBlendComparisonResponse = await fetch("http://localhost:8000/mcd", {
        method: "POST",
        body: formDataSecondary,
    });
    const secondaryBlendComparisonData = await secondaryBlendComparisonResponse.json();

    primaryMCD = primaryBlendComparisonData.mcd;
    secondaryMCD = secondaryBlendComparisonData.mcd;
  }
  

  return {
    audioUrl,
    primarySampleUrl, // URL to listen to the primary voice sample (before blending)
    secondarySampleUrl, // URL to listen to the secondary voice sample
    primaryMCD, // Mel Cepstral Distortion between blended audio and primary
    secondaryMCD // Mel Cepstral Distortion between blended audio and secondary
  }
}

