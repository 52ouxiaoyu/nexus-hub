import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_get_fusion = """    getFusionResult(plantA, plantB) {
        const set = new Set([plantA, plantB]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';
        if (set.has('wallnut') && set.has('chomper')) return 'fusion_spikynut';
        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        return null;
    }"""

new_get_fusion = """    getFusionResult(plantA, plantB) {
        if (plantA === 'peashooter' && plantB === 'peashooter') return 'repeater';
        if (plantA === 'repeater' && plantB === 'peashooter') return 'threepeater';
        if (plantA === 'peashooter' && plantB === 'repeater') return 'threepeater';
        if (plantA === 'repeater' && plantB === 'repeater') return 'gatlingpea';
        if (plantA === 'sunflower' && plantB === 'sunflower') return 'twinsunflower';
        if (plantA === 'puffshroom' && plantB === 'puffshroom') return 'fumeshroom';
        
        const set = new Set([plantA, plantB]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';
        if (set.has('wallnut') && set.has('chomper')) return 'fusion_spikynut';
        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        if (set.has('peashooter') && set.has('iceshroom')) return 'snowpea';
        if (set.has('peashooter') && set.has('squash')) return 'splitpea';
        if (set.has('puffshroom') && set.has('sunflower')) return 'sunshroom';
        if (set.has('puffshroom') && set.has('peashooter')) return 'scaredyshroom';
        if (set.has('wallnut') && set.has('jalapeno')) return 'torchwood';
        return null;
    }"""

content = content.replace(old_get_fusion, new_get_fusion)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

